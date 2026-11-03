const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Variables du cahier des charges : UPLOAD_PATH=./uploads et MAX_FILE_SIZE=10485760 (10 Mo).
// Sans variable, le dossier par défaut est backend/uploads (à ajouter au .gitignore).
const UPLOAD_DIR = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.join(__dirname, "..", "..", "uploads");
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

const TYPES_AUTORISES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.google-earth.kml+xml",
  "application/geo+json",
];

const storage = multer.diskStorage({
  // Rangement par date : uploads/AAAA/MM/JJ/ (le dossier est créé s'il n'existe pas)
  destination: (req, file, cb) => {
    const maintenant = new Date();
    const dir = path.join(
      UPLOAD_DIR,
      String(maintenant.getFullYear()),
      String(maintenant.getMonth() + 1).padStart(2, "0"),
      String(maintenant.getDate()).padStart(2, "0")
    );
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  // Nom du fichier = UUID (jamais le nom d'origine, pour éviter collisions et injections)
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (TYPES_AUTORISES.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Type de fichier non autorisé (PDF, PNG, JPEG, KML ou GeoJSON uniquement)."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { upload, UPLOAD_DIR, MAX_FILE_SIZE };
