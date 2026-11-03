const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");

// Deux parcelles qui se touchent seulement sur une frontière ne se chevauchent pas :
// on exige une surface commune supérieure à ce seuil (en m²).
const SEUIL_CHEVAUCHEMENT_M2 = 0.1;

const GEOM = "ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)";

function erreur(message, code, extra = {}) {
  const e = new Error(message);
  e.code = code;
  Object.assign(e, extra);
  return e;
}

function verifierPolygone(geometrie) {
  let g = geometrie;
  if (typeof g === "string") {
    try {
      g = JSON.parse(g);
    } catch {
      g = null;
    }
  }
  if (!g || g.type !== "Polygon" || !Array.isArray(g.coordinates)) {
    throw erreur("La géométrie doit être un GeoJSON de type Polygon.", "GEOMETRIE_INVALIDE");
  }
  return JSON.stringify({ type: g.type, coordinates: g.coordinates });
}

// ST_IsValid (cahier section 4)
async function estGeometrieValide(geojson) {
  const rows = await sequelize.query(`SELECT ST_IsValid(${GEOM}) AS valide`, {
    replacements: { geojson },
    type: QueryTypes.SELECT,
  });
  return rows[0].valide === true;
}

// ST_Area en m² (calcul sur l'ellipsoïde via le type geography)
async function calculerSurface(geojson) {
  const rows = await sequelize.query(`SELECT ST_Area(${GEOM}::geography) AS surface`, {
    replacements: { geojson },
    type: QueryTypes.SELECT,
  });
  return Number(rows[0].surface);
}

// ST_Intersects avec les parcelles STATUT = 'CERTIFIEE' uniquement (cahier section 4).
// excludeId : on exclut la parcelle elle-même lors d'une modification ou d'un contrôle.
async function trouverParcellesChevauchantes(geojson, excludeId) {
  const exclusion = excludeId ? "AND id <> CAST(:excludeId AS uuid)" : "";
  return sequelize.query(
    `SELECT id, reference
       FROM parcelles
      WHERE statut = 'CERTIFIEE'
        AND geometrie IS NOT NULL
        AND ST_Intersects(geometrie, ${GEOM})
        AND ST_Area(ST_Intersection(geometrie, ${GEOM})::geography) > :seuil
        ${exclusion}`,
    {
      replacements: { geojson, seuil: SEUIL_CHEVAUCHEMENT_M2, excludeId: excludeId || null },
      type: QueryTypes.SELECT,
    }
  );
}

async function validerEtEnrichirParcelle(geometrie, excludeId) {
  const geojson = verifierPolygone(geometrie);

  if (!(await estGeometrieValide(geojson))) {
    throw erreur("Géométrie invalide (polygone auto-intersecté ou non fermé).", "GEOMETRIE_INVALIDE");
  }

  const surface_m2 = await calculerSurface(geojson);

  const parcelles = await trouverParcellesChevauchantes(geojson, excludeId);
  if (parcelles.length > 0) {
    throw erreur(
      `Chevauchement avec une parcelle certifiée : ${parcelles.map((p) => p.reference).join(", ")}`,
      "CHEVAUCHEMENT_DETECTE",
      { parcelles }
    );
  }

  return { surface_m2 };
}

module.exports = {
  verifierPolygone,
  estGeometrieValide,
  calculerSurface,
  trouverParcellesChevauchantes,
  validerEtEnrichirParcelle,
};
