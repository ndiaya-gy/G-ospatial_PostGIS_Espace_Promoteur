const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const Parcelle = require("../models/Parcelle");

/**
 * Vérifie que la géométrie d'une parcelle est topologiquement valide
 * (pas d'auto-intersection, anneau bien fermé, etc.) avant sauvegarde.
 */
async function estGeometrieValide(geoJsonPolygon) {
  const [result] = await sequelize.query(
    `SELECT ST_IsValid(ST_GeomFromGeoJSON(:geojson)) AS valide,
            ST_IsValidReason(ST_GeomFromGeoJSON(:geojson)) AS raison`,
    {
      replacements: { geojson: JSON.stringify(geoJsonPolygon) },
      type: QueryTypes.SELECT,
    }
  );
  return { valide: result.valide, raison: result.raison };
}

/**
 * Calcule la surface d'une parcelle en m².
 * ST_Area sur une géométrie géographique (::geography) donne un
 * résultat en mètres carrés même avec des coordonnées GPS (SRID 4326).
 */
async function calculerSurface(geoJsonPolygon) {
  const [result] = await sequelize.query(
    `SELECT ST_Area(ST_GeomFromGeoJSON(:geojson)::geography) AS surface_m2`,
    {
      replacements: { geojson: JSON.stringify(geoJsonPolygon) },
      type: QueryTypes.SELECT,
    }
  );
  return result.surface_m2;
}

/**
 * Retourne la liste des parcelles existantes qui chevauchent
 * (ST_Intersects) la géométrie donnée. Utile pour bloquer la
 * soumission d'une parcelle qui empiète sur une parcelle déjà déposée.
 */
async function trouverParcellesChevauchantes(geoJsonPolygon, excludeId = null) {
  const whereExclude = excludeId ? "AND id != :excludeId" : "";

  const parcelles = await sequelize.query(
    `SELECT id, reference
     FROM parcelles
     WHERE ST_Intersects(geometrie, ST_GeomFromGeoJSON(:geojson))
     ${whereExclude}`,
    {
      replacements: {
        geojson: JSON.stringify(geoJsonPolygon),
        excludeId,
      },
      type: QueryTypes.SELECT,
    }
  );

  return parcelles;
}

/**
 * Pipeline complet de validation appelé avant la création/soumission
 * d'une parcelle : validité géométrique -> chevauchement -> surface.
 */
async function validerEtEnrichirParcelle(geoJsonPolygon, excludeId = null) {
  const { valide, raison } = await estGeometrieValide(geoJsonPolygon);
  if (!valide) {
    const erreur = new Error(`Géométrie invalide : ${raison}`);
    erreur.code = "GEOMETRIE_INVALIDE";
    throw erreur;
  }

  const chevauchements = await trouverParcellesChevauchantes(
    geoJsonPolygon,
    excludeId
  );
  if (chevauchements.length > 0) {
    const erreur = new Error(
      `Cette géométrie chevauche ${chevauchements.length} parcelle(s) existante(s)`
    );
    erreur.code = "CHEVAUCHEMENT_DETECTE";
    erreur.parcelles = chevauchements;
    throw erreur;
  }

  const surface_m2 = await calculerSurface(geoJsonPolygon);
  return { surface_m2 };
}

module.exports = {
  estGeometrieValide,
  calculerSurface,
  trouverParcellesChevauchantes,
  validerEtEnrichirParcelle,
};
