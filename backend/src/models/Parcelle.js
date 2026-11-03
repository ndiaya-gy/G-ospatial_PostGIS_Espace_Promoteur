const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Statuts du cahier des charges (section 7, table parcelles)
const STATUTS = [
  "BROUILLON",
  "SOUMISE",
  "VALIDE_CADASTRE",
  "REJETE_CADASTRE",
  "VALIDE_NOTAIRE",
  "REJETE_NOTAIRE",
  "CERTIFIEE",
];

const Parcelle = sequelize.define(
  "Parcelle",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: { isIn: [["URBAIN", "RURAL"]] },
    },
    superficie_declaree: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    // Polygone en projection WGS84 (GeoJSON)
    geometrie: {
      type: DataTypes.GEOMETRY("POLYGON", 4326),
      allowNull: false,
    },
    statut: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "BROUILLON",
      validate: { isIn: [STATUTS] },
    },
    nicad: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Hors script du cahier, mais affichée par les maquettes
    localisation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createur_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
  },
  {
    tableName: "parcelles",
    timestamps: true,
    underscored: true, // created_at / updated_at, comme le cahier
    indexes: [
      // Index spatial du cahier pour accélérer la détection de chevauchement
      { name: "idx_parcelles_geometrie", using: "GIST", fields: ["geometrie"] },
    ],
  }
);

Parcelle.STATUTS = STATUTS;

module.exports = Parcelle;
