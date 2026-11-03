const fs = require("fs");
const Parcelle = require("../models/Parcelle");
const Document = require("../models/Document");
const geospatialService = require("../services/geospatialService");
const documentService = require("../services/documentService");
const blockchainService = require("../services/blockchainService");

const TOLERANCE_SUPERFICIE = 0.05; // 5 %, cahier section 4

const estProprietaire = (parcelle, user) => String(parcelle.createur_id) === String(user?.id);
const peutVoir = (parcelle, user) => user?.role !== "PROMOTEUR" || estProprietaire(parcelle, user);
const ecartRelatif = (declaree, calculee) =>
  calculee > 0 ? Math.abs(calculee - declaree) / calculee : 0;
const supprimerFichier = (file) => file && fs.promises.unlink(file.path).catch(() => {});

// Cahier : écart > 5 % => alerte (n'empêche pas l'enregistrement du brouillon).
// Seul le chevauchement avec une parcelle CERTIFIEE bloque.
function construireAlerte(declaree, calculee) {
  const ecart = ecartRelatif(declaree, calculee);
  if (ecart <= TOLERANCE_SUPERFICIE) return null;
  return (
    `Écart de ${(ecart * 100).toFixed(2)} % entre la superficie déclarée (${declaree} m²) ` +
    `et la superficie calculée (${calculee.toFixed(2)} m²) : tolérance de 5 % dépassée.`
  );
}

/**
 * POST /api/parcelles
 * Création d'une parcelle en BROUILLON, avec contrôle PostGIS.
 */
async function creerParcelle(req, res) {
  try {
    const { reference, type, nicad, geometrie, localisation, superficie_declaree } = req.body;
    const createur_id = req.user?.id;

    if (!type || !["URBAIN", "RURAL"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Le type de parcelle (URBAIN ou RURAL) est requis.",
      });
    }
    if (!superficie_declaree || Number(superficie_declaree) <= 0) {
      return res.status(400).json({
        success: false,
        message: "La superficie déclarée est requise et doit être positive.",
      });
    }

    const { surface_m2 } = await geospatialService.validerEtEnrichirParcelle(geometrie);

    const parcelle = await Parcelle.create({
      reference,
      type,
      nicad,
      geometrie,
      localisation,
      superficie_declaree,
      createur_id,
      statut: "BROUILLON",
    });

    return res.status(201).json({
      success: true,
      data: parcelle,
      superficie_calculee: surface_m2,
      alerte: construireAlerte(Number(superficie_declaree), surface_m2),
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ success: false, message: "Cette référence existe déjà." });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.parcelles,
    });
  }
}

/**
 * PUT /api/parcelles/:id
 * Modification d'un BROUILLON uniquement : dès la soumission, l'état est tracé sur Fabric.
 */
async function modifierParcelle(req, res) {
  try {
    const parcelle = await Parcelle.findByPk(req.params.id);
    if (!parcelle) {
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }
    if (!estProprietaire(parcelle, req.user)) {
      return res.status(403).json({ success: false, message: "Non autorisé" });
    }
    if (parcelle.statut !== "BROUILLON") {
      return res.status(409).json({
        success: false,
        message: `Modification impossible : statut ${parcelle.statut}. Seul un BROUILLON est modifiable.`,
      });
    }

    const champs = {};
    for (const k of ["reference", "type", "nicad", "localisation", "superficie_declaree"]) {
      if (req.body[k] !== undefined) champs[k] = req.body[k];
    }
    if (champs.type !== undefined && !["URBAIN", "RURAL"].includes(champs.type)) {
      return res.status(400).json({ success: false, message: "type doit valoir URBAIN ou RURAL." });
    }
    if (champs.superficie_declaree !== undefined && !(Number(champs.superficie_declaree) > 0)) {
      return res.status(400).json({ success: false, message: "La superficie déclarée doit être positive." });
    }
    if (req.body.geometrie) champs.geometrie = req.body.geometrie;

    let superficieCalculee = null;
    let alerte = null;
    if (champs.geometrie || champs.superficie_declaree !== undefined) {
      // on exclut la parcelle elle-même du test de chevauchement
      const { surface_m2 } = await geospatialService.validerEtEnrichirParcelle(
        champs.geometrie || parcelle.geometrie,
        parcelle.id
      );
      superficieCalculee = surface_m2;
      alerte = construireAlerte(
        Number(champs.superficie_declaree ?? parcelle.superficie_declaree),
        surface_m2
      );
    }

    await parcelle.update(champs);
    return res.status(200).json({
      success: true,
      data: parcelle,
      superficie_calculee: superficieCalculee,
      alerte,
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ success: false, message: "Cette référence existe déjà." });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.parcelles,
    });
  }
}

/**
 * DELETE /api/parcelles/:id
 * Suppression d'un BROUILLON uniquement : une parcelle passée par Fabric
 * (soumise, validée, rejetée ou certifiée) n'est jamais supprimée.
 */
async function supprimerParcelle(req, res) {
  try {
    const parcelle = await Parcelle.findByPk(req.params.id);
    if (!parcelle) {
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }
    if (!estProprietaire(parcelle, req.user)) {
      return res.status(403).json({ success: false, message: "Non autorisé" });
    }
    if (parcelle.statut !== "BROUILLON") {
      return res.status(409).json({
        success: false,
        message: `Suppression impossible : statut ${parcelle.statut}. Une parcelle tracée sur la blockchain n'est jamais supprimée.`,
      });
    }

    // supprime les fichiers du disque, puis les lignes en base
    const documents = await Document.findAll({ where: { parcelle_id: parcelle.id } });
    for (const d of documents) {
      if (d.chemin_fichier) await fs.promises.unlink(d.chemin_fichier).catch(() => {});
    }
    await Document.destroy({ where: { parcelle_id: parcelle.id } });
    await parcelle.destroy();

    return res.status(200).json({ success: true, message: "Parcelle supprimée" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/parcelles/:id/documents   (champ multipart "document")
 * Dépose un document justificatif et retourne son empreinte SHA-256.
 */
async function ajouterDocument(req, res) {
  try {
    const parcelle = await Parcelle.findByPk(req.params.id);
    if (!parcelle) {
      await supprimerFichier(req.file);
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }
    if (!estProprietaire(parcelle, req.user)) {
      await supprimerFichier(req.file);
      return res.status(403).json({ success: false, message: "Non autorisé" });
    }
    if (parcelle.statut !== "BROUILLON") {
      await supprimerFichier(req.file);
      return res.status(409).json({
        success: false,
        message: `Ajout impossible : statut ${parcelle.statut}.`,
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Aucun fichier reçu" });
    }

    const document = await documentService.enregistrerDocument({
      file: req.file,
      parcelleId: parcelle.id,
    });

    return res.status(201).json({ success: true, hash: document.hash_sha256, data: document });
  } catch (err) {
    await supprimerFichier(req.file);
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/parcelles/:id/controle-geo
 * Résultat des contrôles PostGIS (ST_IsValid, ST_Area, chevauchements) sans modifier la parcelle.
 */
async function controleGeo(req, res) {
  try {
    const parcelle = await Parcelle.findByPk(req.params.id);
    if (!parcelle) {
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }
    if (!peutVoir(parcelle, req.user)) {
      return res.status(403).json({ success: false, message: "Non autorisé" });
    }

    const declaree = Number(parcelle.superficie_declaree);
    const resultat = { parcelleId: parcelle.id, superficieDeclaree: declaree };

    try {
      const { surface_m2 } = await geospatialService.validerEtEnrichirParcelle(
        parcelle.geometrie,
        parcelle.id
      );
      const ecart = ecartRelatif(declaree, surface_m2);
      resultat.geometrieValide = true;
      resultat.superficieCalculee = surface_m2;
      resultat.ecartPourcent = Math.round(ecart * 10000) / 100;
      resultat.toleranceOk = ecart <= TOLERANCE_SUPERFICIE;
      resultat.chevauchements = [];
      resultat.conforme = resultat.toleranceOk;
    } catch (err) {
      const chevauche = Array.isArray(err.parcelles) && err.parcelles.length > 0;
      resultat.geometrieValide = chevauche; // un chevauchement suppose une géométrie valide
      resultat.chevauchements = chevauche ? err.parcelles : [];
      resultat.erreur = err.message;
      resultat.code = err.code;
      resultat.conforme = false;
    }

    return res.status(200).json({ success: true, data: resultat });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/parcelles/:id/soumettre
 * BROUILLON -> SOUMISE, avec enregistrement de la preuve sur Fabric.
 * Le document est déposé avant, via POST /:id/documents : c'est son dernier hash qui part sur Fabric.
 *
 * Fabric est appelé AVANT la mise à jour en base : s'il échoue, la base n'est pas modifiée.
 */
async function soumettreParcelle(req, res) {
  try {
    const parcelle = await Parcelle.findByPk(req.params.id);

    if (!parcelle) {
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }
    if (!estProprietaire(parcelle, req.user)) {
      return res.status(403).json({ success: false, message: "Non autorisé" });
    }
    if (parcelle.statut !== "BROUILLON") {
      return res.status(400).json({
        success: false,
        message: `La parcelle est déjà à l'état ${parcelle.statut}`,
      });
    }

    const document = await Document.findOne({
      where: { parcelle_id: parcelle.id },
      order: [["createdAt", "DESC"]],
    });
    if (!document) {
      return res.status(400).json({
        success: false,
        message: "Un document justificatif est requis pour soumettre la parcelle",
      });
    }

    // Cahier : SubmitParcel(parcelId, reference, docHash, userId)
    const fabricResult = await blockchainService.submitParcel(
      parcelle.id,
      parcelle.reference,
      document.hash_sha256,
      req.user.id
    );

    parcelle.statut = "SOUMISE";
    await parcelle.save();

    return res.status(200).json({
      success: true,
      data: parcelle,
      fabricTransaction: fabricResult,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/parcelles/:id
 * Un promoteur ne voit que ses parcelles ; Cadastre et Notaire voient tout.
 */
async function obtenirParcelle(req, res) {
  try {
    const parcelle = await Parcelle.findByPk(req.params.id);
    if (!parcelle) {
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }
    if (!peutVoir(parcelle, req.user)) {
      return res.status(403).json({ success: false, message: "Non autorisé" });
    }
    return res.status(200).json({ success: true, data: parcelle });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/parcelles
 * Liste des parcelles du promoteur connecté (Dashboard).
 */
async function listerParcelles(req, res) {
  try {
    const parcelles = await Parcelle.findAll({ where: { createur_id: req.user?.id } });
    return res.status(200).json({ success: true, data: parcelles });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  creerParcelle,
  modifierParcelle,
  supprimerParcelle,
  ajouterDocument,
  controleGeo,
  soumettreParcelle,
  obtenirParcelle,
  listerParcelles,
};
