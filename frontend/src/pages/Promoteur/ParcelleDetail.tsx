import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ParcelleMap, { GeoPolygon } from "../../components/maps/ParcelleMap";
import axiosClient from "../../api/axiosClient";

interface ParcelleDetailData {
  id: string;
  reference: string;
  statut: string;
  surface_m2: number;
  localisation: string;
  geometrie: GeoPolygon;
}

export default function ParcelleDetail() {
  const { id } = useParams();
  const [parcelle, setParcelle] = useState<ParcelleDetailData | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    axiosClient
      .get(`/api/v1/parcelles/${id}`)
      .then((res) => setParcelle(res.data.data))
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) return <p className="p-6">Chargement...</p>;
  if (!parcelle) return <p className="p-6">Parcelle introuvable.</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">{parcelle.reference}</h1>
      <p className="text-gray-600 mb-4">
        {parcelle.localisation} — {parcelle.surface_m2?.toFixed(0)} m² —{" "}
        <span className="font-medium">{parcelle.statut}</span>
      </p>

      <ParcelleMap mode="lecture-seule" geometrie={parcelle.geometrie} />

      {parcelle.statut === "brouillon" && (
        <Link
          to={`/promoteur/parcelles/${parcelle.id}/soumettre`}
          className="inline-block mt-4 px-4 py-2 rounded bg-blue-600 text-white"
        >
          Soumettre au Cadastre
        </Link>
      )}
    </div>
  );
}
