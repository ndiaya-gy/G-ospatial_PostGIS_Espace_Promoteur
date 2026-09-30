import axios from "axios";

// FICHIER TEMPORAIRE — à SUPPRIMER une fois que Carla fournit le
// vrai frontend/src/api/axiosClient.ts (avec gestion du token JWT).
// Sert juste à pouvoir tester tes pages en attendant.

const axiosClient = axios.create({
  baseURL: "http://localhost:4000",
});

export default axiosClient;
