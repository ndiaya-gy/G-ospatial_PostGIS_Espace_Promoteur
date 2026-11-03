const multer = require("multer");
const { upload, MAX_FILE_SIZE } = require("../config/upload");

const unDocument = upload.single("document");

/**
 * Middleware d'upload du document justificatif (champ multipart "document").
 * Renvoie des erreurs lisibles au lieu d'une erreur 500 brute de multer.
 */
function handleParcelleUpload(req, res, next) {
  unDocument(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: `Fichier trop volumineux (${Math.round(MAX_FILE_SIZE / 1024 / 1024)} Mo maximum).`,
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: 'Le fichier doit être envoyé dans le champ "document".',
        });
      }
    }
    return res.status(400).json({ success: false, message: err.message });
  });
}

module.exports = { handleParcelleUpload };
