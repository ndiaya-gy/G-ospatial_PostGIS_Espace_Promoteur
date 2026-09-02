const { DataTypes } = require("sequelize");

// NOTE : adapte l'import ci-dessous au fichier de connexion de Carla
// (backend/src/config/db.js) une fois qu'il est disponible dans le repo.
const sequelize = require("../config/db");

const Parcelle = sequelize.define(
  "Parcelle",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "Référence cadastrale ou identifiant interne de la parcelle",
    },
    // Champ géométrique : polygone en SRID 4326 (coordonnées GPS WGS84)
    geometrie: {
      type: DataTypes.GEOMETRY("POLYGON", 4326),
      allowNull: false,
    },
    surface_m2: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Calculée via ST_Area, remplie par geospatialService",
    },
    localisation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM(
        "brouillon",
        "soumise",
        "validee_cadastre",
        "certifiee_notaire",
        "rejetee"
      ),
      defaultValue: "brouillon",
    },
    promoteur_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "FK vers User.js (modèle de Carla)",
    },
  },
  {
    tableName: "parcelles",
    timestamps: true,
  }
);

module.exports = Parcelle;
