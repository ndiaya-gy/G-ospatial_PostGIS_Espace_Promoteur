import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ParcelleMap, { GeoPolygon } from "../../components/maps/ParcelleMap";
import axiosClient from "../../api/axiosClient";

export default function CreateParcelle() {
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [geometrie, setGeometrie] = useState<GeoPolygon | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!geometrie) {
      setErreur("Trace le contour de la parcelle sur la carte avant de continuer.");
      return;
    }

    setEnvoiEnCours(true);
    try {
      const res = await axiosClient.post("/api/v1/parcelles", {
        reference,
        localisation,
        geometrie,
      });
      navigate(`/promoteur/parcelles/${res.data.data.id}`);
    } catch (err: any) {
      setErreur(
        err.response?.data?.message ?? "Erreur lors de la création de la parcelle"
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Nouvelle parcelle</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Référence</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Localisation</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={localisation}
            onChange={(e) => setLocalisation(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Contour de la parcelle
          </label>
          <ParcelleMap mode="dessin" onGeometrieChange={setGeometrie} />
        </div>

        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

        <button
          type="submit"
          disabled={envoiEnCours}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {envoiEnCours ? "Création..." : "Créer la parcelle"}
        </button>
      </form>
    </div>
  );
}
