const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Dossier de stockage local des documents uploadés (plans, titres, etc.)
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "parcelles");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

// Types de fichiers acceptés pour les documents fonciers
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.google-earth.kml+xml",
  "application/geo+json",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo max
});

module.exports = { upload, UPLOAD_DIR };
