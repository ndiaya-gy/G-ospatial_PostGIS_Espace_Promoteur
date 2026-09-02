import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

export default function SoumettreParcelle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);

    try {
      const formData = new FormData();
      if (fichier) formData.append("document", fichier);

      await axiosClient.post(`/api/v1/parcelles/${id}/soumettre`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate(`/promoteur/parcelles/${id}`);
    } catch (err: any) {
      setErreur(
        err.response?.data?.message ?? "Erreur lors de la soumission"
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-semibold mb-4">Soumettre la parcelle</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Document justificatif (titre foncier, plan...)
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.kml,.geojson"
            onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            className="block w-full"
          />
        </div>

        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

        <button
          type="submit"
          disabled={envoiEnCours}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {envoiEnCours ? "Envoi..." : "Soumettre au Cadastre"}
        </button>
      </form>
    </div>
  );
}
