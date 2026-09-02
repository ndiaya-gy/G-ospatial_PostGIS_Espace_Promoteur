const { upload } = require("../config/upload");

// Middleware réutilisable pour les routes de soumission de parcelle.
// Accepte un seul fichier via le champ "document" du formulaire.
const handleParcelleUpload = (req, res, next) => {
  const single = upload.single("document");

  single(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Erreur lors de l'upload du fichier",
      });
    }
    next();
  });
};

module.exports = { handleParcelleUpload };
