const Parcelle = require("../models/Parcelle");
const geospatialService = require("../services/geospatialService");
const documentService = require("../services/documentService");

/**
 * POST /api/v1/parcelles
 * Création d'une parcelle en brouillon, avec validation géospatiale.
 */
async function creerParcelle(req, res) {
  try {
    const { reference, geometrie, localisation } = req.body;
    const promoteur_id = req.user?.id; // fourni par le middleware auth.js (Carla)

    const { surface_m2 } = await geospatialService.validerEtEnrichirParcelle(
      geometrie
    );

    const parcelle = await Parcelle.create({
      reference,
      geometrie,
      localisation,
      surface_m2,
      promoteur_id,
      statut: "brouillon",
    });

    return res.status(201).json({ success: true, data: parcelle });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.parcelles,
    });
  }
}

/**
 * POST /api/v1/parcelles/:id/soumettre
 * Passage du statut brouillon -> soumise, avec upload du document
 * justificatif (géré en amont par le middleware handleParcelleUpload).
 */
async function soumettreParcelle(req, res) {
  try {
    const { id } = req.params;
    const parcelle = await Parcelle.findByPk(id);

    if (!parcelle) {
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }

    if (req.file) {
      await documentService.enregistrerDocument({
        file: req.file,
        parcelleId: parcelle.id,
      });
    }

    parcelle.statut = "soumise";
    await parcelle.save();

    return res.status(200).json({ success: true, data: parcelle });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/parcelles/:id
 */
async function obtenirParcelle(req, res) {
  try {
    const parcelle = await Parcelle.findByPk(req.params.id);
    if (!parcelle) {
      return res.status(404).json({ success: false, message: "Parcelle introuvable" });
    }
    return res.status(200).json({ success: true, data: parcelle });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/parcelles?promoteur_id=...
 * Liste des parcelles du promoteur connecté (pour le Dashboard).
 */
async function listerParcelles(req, res) {
  try {
    const promoteur_id = req.user?.id;
    const parcelles = await Parcelle.findAll({ where: { promoteur_id } });
    return res.status(200).json({ success: true, data: parcelles });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  creerParcelle,
  soumettreParcelle,
  obtenirParcelle,
  listerParcelles,
};
