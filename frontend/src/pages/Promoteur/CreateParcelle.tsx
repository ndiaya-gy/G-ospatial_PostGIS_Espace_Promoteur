import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ParcelleMap from "../../components/maps/ParcelleMap";
import type { GeoPolygon } from "../../components/maps/ParcelleMap";
import axiosClient from "../../api/axiosClient";

const TOLERANCE_POURCENT = 5;
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024; // 10 Mo
const TYPES_ACCEPTES = ["application/pdf", "image/jpeg", "image/png"];

const fmtEntier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const fmtDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/**
 * Surface d'un polygone GeoJSON en m² (formule sphérique, la même que
 * leaflet-draw). C'est une ESTIMATION d'aperçu : la valeur officielle est
 * recalculée par PostGIS (ST_Area) côté serveur à l'enregistrement.
 */
function surfaceGeodesique(anneau: number[][]): number {
  const RAYON_TERRE = 6378137;
  const rad = Math.PI / 180;
  let somme = 0;
  for (let i = 0; i < anneau.length; i++) {
    const [lng1, lat1] = anneau[i];
    const [lng2, lat2] = anneau[(i + 1) % anneau.length];
    somme +=
      (lng2 - lng1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  return Math.abs((somme * RAYON_TERRE * RAYON_TERRE) / 2);
}

async function sha256Hex(fichier: File): Promise<string> {
  const contenu = await fichier.arrayBuffer();
  const empreinte = await crypto.subtle.digest("SHA-256", contenu);
  return Array.from(new Uint8Array(empreinte))
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

const classeChamp =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 " +
  "placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none " +
  "focus:ring-2 focus:ring-indigo-200";
const classeLabel = "mb-1.5 block text-sm font-medium text-slate-700";

export default function CreateParcelle() {
  const navigate = useNavigate();

  const [reference, setReference] = useState("");
  const [type, setType] = useState("URBAIN");
  const [nicad, setNicad] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [superficieSaisie, setSuperficieSaisie] = useState("");
  const [geometrie, setGeometrie] = useState<GeoPolygon | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [empreinte, setEmpreinte] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [codeErreur, setCodeErreur] = useState<string | null>(null);
  const [action, setAction] = useState<"brouillon" | "soumission" | null>(null);

  // Si la parcelle est créée mais qu'une étape suivante échoue, on ne
  // recrée pas la parcelle (la référence est unique) au nouvel essai.
  const parcelleIdRef = useRef<string | null>(null);
  const documentEnvoyeRef = useRef(false);

  const handleGeometrie = useCallback((g: GeoPolygon) => {
    setGeometrie(g);
    setCodeErreur(null);
  }, []);

  const sommets = geometrie ? Math.max(geometrie.coordinates[0].length - 1, 0) : 0;

  const superficieCalculee = useMemo(
    () => (geometrie ? surfaceGeodesique(geometrie.coordinates[0]) : null),
    [geometrie]
  );

  const saisie = parseFloat(superficieSaisie);
  const ecart =
    superficieCalculee && superficieCalculee > 0 && saisie > 0
      ? (Math.abs(superficieCalculee - saisie) / superficieCalculee) * 100
      : null;
  const ecartAcceptable = ecart !== null && ecart <= TOLERANCE_POURCENT;

  const handleFichier = async (e: ChangeEvent<HTMLInputElement>) => {
    const choisi = e.target.files?.[0] ?? null;
    setEmpreinte(null);
    documentEnvoyeRef.current = false;
    if (!choisi) {
      setFichier(null);
      return;
    }
    if (!TYPES_ACCEPTES.includes(choisi.type)) {
      setFichier(null);
      setErreur("Format non accepté : choisissez un PDF, un JPG ou un PNG.");
      return;
    }
    if (choisi.size > TAILLE_MAX_OCTETS) {
      setFichier(null);
      setErreur("Le fichier dépasse 10 Mo.");
      return;
    }
    setErreur(null);
    setFichier(choisi);
    try {
      setEmpreinte(await sha256Hex(choisi));
    } catch {
      setEmpreinte(null); // l'empreinte officielle est calculée par le serveur
    }
  };

  const enregistrer = async (soumettre: boolean) => {
    setErreur(null);
    setCodeErreur(null);

    if (!reference.trim()) {
      setErreur("La référence est requise.");
      return;
    }
    if (!(saisie > 0)) {
      setErreur("La superficie saisie doit être un nombre positif.");
      return;
    }
    if (!geometrie) {
      setErreur("Tracez le contour de la parcelle sur la carte avant de continuer.");
      return;
    }
    if (soumettre && !fichier) {
      setErreur("Joignez le titre ou le plan avant de soumettre au Cadastre.");
      return;
    }

    setAction(soumettre ? "soumission" : "brouillon");
    try {
      if (!parcelleIdRef.current) {
        const res = await axiosClient.post("/api/v1/parcelles", {
          reference: reference.trim(),
          type,
          nicad: nicad.trim() || undefined,
          localisation: localisation.trim() || undefined,
          superficie_saisie: saisie,
          geometrie,
        });
        parcelleIdRef.current = res.data.data.id as string;
      }
      const id = parcelleIdRef.current;

      if (fichier && !documentEnvoyeRef.current) {
        const formulaire = new FormData();
        formulaire.append("document", fichier);
        await axiosClient.post(`/api/v1/parcelles/${id}/documents`, formulaire);
        documentEnvoyeRef.current = true;
      }

      if (soumettre) {
        await axiosClient.put(`/api/v1/parcelles/${id}/soumettre`);
      }

      navigate(`/promoteur/parcelles/${id}`);
    } catch (err: any) {
      const donnees = err?.response?.data;
      const message: string =
        donnees?.message ??
        (err?.response
          ? "Erreur lors de l'enregistrement de la parcelle."
          : "Impossible de joindre le serveur.");
      setCodeErreur(donnees?.code ?? null);
      setErreur(
        parcelleIdRef.current
          ? `La parcelle est enregistrée en brouillon, mais l'étape suivante a échoué : ${message}`
          : message
      );
    } finally {
      setAction(null);
    }
  };

  // ---- Badge de statut du tracé (carte de droite) ----
  let badge = { texte: "Aucun tracé", classe: "bg-slate-100 text-slate-600" };
  if (codeErreur === "GEOMETRIE_INVALIDE") {
    badge = { texte: "Géométrie invalide", classe: "bg-red-100 text-red-700" };
  } else if (codeErreur === "CHEVAUCHEMENT_DETECTE") {
    badge = { texte: "Chevauchement détecté", classe: "bg-red-100 text-red-700" };
  } else if (geometrie) {
    badge = {
      texte: "Tracé effectué · contrôle PostGIS à l'enregistrement",
      classe: "bg-indigo-50 text-indigo-700",
    };
  }

  // ---- Boîte « Superficie calculée » ----
  let classeCalculee = "border-slate-300 bg-slate-50 text-slate-500";
  let texteCalculee = "Tracez la parcelle";
  if (superficieCalculee !== null) {
    texteCalculee = `${fmtEntier.format(superficieCalculee)} m²`;
    if (ecart !== null) {
      texteCalculee += ` · écart ${fmtDecimal.format(ecart)} %`;
      classeCalculee = ecartAcceptable
        ? "border-green-400 bg-green-50 text-green-800"
        : "border-red-400 bg-red-50 text-red-700";
    } else {
      classeCalculee = "border-slate-300 bg-slate-50 text-slate-700";
    }
  }

  const onSubmit = (e: FormEvent) => e.preventDefault();
  const occupe = action !== null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-slate-900">Déclarer une parcelle</h1>
        <p className="mt-1 text-slate-500">
          Dessinez le polygone sur la carte. La superficie est recalculée par
          PostGIS à l'enregistrement et comparée à votre saisie (tolérance{" "}
          {TOLERANCE_POURCENT} %).
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* ---------- Formulaire ---------- */}
          <form
            onSubmit={onSubmit}
            className="space-y-4 self-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={classeLabel} htmlFor="reference">
                  Référence
                </label>
                <input
                  id="reference"
                  className={classeChamp}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="REF-2026-014"
                />
              </div>
              <div>
                <label className={classeLabel} htmlFor="type">
                  Type
                </label>
                <select
                  id="type"
                  className={classeChamp}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="URBAIN">URBAIN</option>
                  <option value="RURAL">RURAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className={classeLabel} htmlFor="nicad">
                NICAD
              </label>
              <input
                id="nicad"
                className={classeChamp}
                value={nicad}
                onChange={(e) => setNicad(e.target.value)}
                placeholder="Numéro d'identification cadastrale"
              />
            </div>

            <div>
              <label className={classeLabel} htmlFor="localisation">
                Localisation
              </label>
              <input
                id="localisation"
                className={classeChamp}
                value={localisation}
                onChange={(e) => setLocalisation(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={classeLabel} htmlFor="superficie">
                  Superficie saisie (m²)
                </label>
                <input
                  id="superficie"
                  type="number"
                  min="0"
                  step="0.01"
                  className={classeChamp}
                  value={superficieSaisie}
                  onChange={(e) => setSuperficieSaisie(e.target.value)}
                />
              </div>
              <div>
                <span className={classeLabel}>Superficie calculée (estimation)</span>
                <div
                  className={`flex min-h-[42px] items-center rounded-lg border border-dashed px-3 py-2.5 text-sm font-semibold ${classeCalculee}`}
                >
                  {texteCalculee}
                </div>
              </div>
            </div>

            <div>
              <span className={classeLabel}>Titre ou plan (PDF, JPG — 10 Mo max)</span>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-5 text-center focus-within:ring-2 focus-within:ring-indigo-200">
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFichier}
                />
                {fichier ? (
                  <>
                    <span className="text-sm font-medium text-indigo-700">
                      {fichier.name} · {fmtDecimal.format(fichier.size / 1024 / 1024)} Mo
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      {empreinte
                        ? `SHA-256 : ${empreinte.slice(0, 4)}…${empreinte.slice(-4)}`
                        : "SHA-256 : calculé par le serveur"}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-indigo-700">
                    Cliquez pour choisir un fichier
                  </span>
                )}
              </label>
            </div>

            {erreur && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {erreur}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                disabled={occupe}
                onClick={() => enregistrer(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {action === "brouillon" ? "Enregistrement…" : "Enregistrer le brouillon"}
              </button>
              <button
                type="button"
                disabled={occupe}
                onClick={() => enregistrer(true)}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {action === "soumission" ? "Soumission…" : "Soumettre au Cadastre"}
              </button>
            </div>
          </form>

          {/* ---------- Carte ---------- */}
          <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Carte · tracé de la parcelle</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.classe}`}>
                {badge.texte}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <ParcelleMap mode="dessin" onGeometrieChange={handleGeometrie} hauteur="420px" />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Cliquez pour ajouter un sommet, glissez pour ajuster. {sommets} sommet
              {sommets > 1 ? "s" : ""}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
