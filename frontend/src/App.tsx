import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Promoteur/Dashboard";
import CreateParcelle from "./pages/Promoteur/CreateParcelle";
import ParcelleDetail from "./pages/Promoteur/ParcelleDetail";
import SoumettreParcelle from "./pages/Promoteur/SoumettreParcelle";

// Routeur de test autonome, le temps que le routeur principal du
// projet (propriété commune à l'équipe) n'intègre ces pages.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/promoteur" replace />} />
        <Route path="/promoteur" element={<Dashboard />} />
        <Route path="/promoteur/parcelles/nouvelle" element={<CreateParcelle />} />
        <Route path="/promoteur/parcelles/:id" element={<ParcelleDetail />} />
        <Route path="/promoteur/parcelles/:id/soumettre" element={<SoumettreParcelle />} />
      </Routes>
    </BrowserRouter>
  );
}
