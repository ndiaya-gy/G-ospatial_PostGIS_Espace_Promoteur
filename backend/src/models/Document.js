const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Parcelle = require("./Parcelle");

const Document = sequelize.define(
  "Document",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nom_original: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chemin_fichier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type_mime: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Empreinte SHA-256 du fichier : prouve l'intégrité du document
    // au moment de la certification par la blockchain.
    hash_sha256: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    parcelle_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Parcelle,
        key: "id",
      },
    },
  },
  {
    tableName: "documents",
    timestamps: true,
    underscored: true,
  }
);

Document.belongsTo(Parcelle, { foreignKey: "parcelle_id" });
Parcelle.hasMany(Document, { foreignKey: "parcelle_id" });

module.exports = Document;
