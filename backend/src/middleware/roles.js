// FICHIER TEMPORAIRE — stub local, le temps que la coéquipière en
// charge du Backend Core & Auth fournisse le vrai
// backend/src/middleware/roles.js.
//
// Usage identique à celui des routes : checkRole("PROMOTEUR") ou
// checkRole("PROMOTEUR", "CADASTRE", "NOTAIRE"). Refuse la requête
// (403) si le rôle de l'utilisateur n'est pas dans la liste.
//
// ⚠️ À SUPPRIMER et remplacer par le vrai fichier dès qu'il est
// disponible dans le dépôt de l'équipe.

module.exports = function checkRole(...rolesAutorises) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !rolesAutorises.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé : rôle insuffisant.",
      });
    }
    next();
  };
};
