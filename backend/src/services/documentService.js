const fs = require("fs");
const crypto = require("crypto");
const Document = require("../models/Document");

/**
 * Calcule le hash SHA-256 d'un fichier sur disque.
 * Utilisé pour prouver l'intégrité du document lors de la
 * certification blockchain (module de Ndeye).
 */
function calculerHashFichier(cheminFichier) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(cheminFichier);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Enregistre un document uploadé en base, lié à une parcelle.
 */
async function enregistrerDocument({ file, parcelleId }) {
  const hash = await calculerHashFichier(file.path);

  const document = await Document.create({
    nom_original: file.originalname,
    chemin_fichier: file.path,
    type_mime: file.mimetype,
    hash_sha256: hash,
    parcelle_id: parcelleId,
  });

  return document;
}

module.exports = { calculerHashFichier, enregistrerDocument };
