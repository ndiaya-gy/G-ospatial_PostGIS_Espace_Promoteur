// FICHIER TEMPORAIRE — stub local, le temps que la coéquipière en
// charge du Backend Core & Auth fournisse le vrai
// backend/src/middleware/auth.js (vérification du token JWT).
//
// Ce stub ne vérifie AUCUN token : il injecte simplement un faux
// utilisateur Promoteur pour pouvoir tester les routes en local.
//
// Il importe aussi le faux modèle User, pour que Sequelize crée la
// table "users" (clé étrangère de Parcelle.createur_id) au démarrage.
//
// ⚠️ À SUPPRIMER et remplacer par le vrai fichier dès qu'il est
// disponible dans le dépôt de l'équipe.

const User = require("../models/User");

module.exports = function auth(req, res, next) {
  req.user = {
    id: User.FAKE_USER_ID,
    role: "PROMOTEUR",
  };
  next();
};
