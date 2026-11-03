// FICHIER TEMPORAIRE — faux modèle User, le temps que la coéquipière
// en charge du Backend Core & Auth fournisse le vrai
// backend/src/models/User.js.
//
// Il sert uniquement à créer la table "users", que la clé étrangère
// Parcelle.createur_id référence. Après chaque création des tables, il
// ajoute le faux utilisateur Promoteur utilisé par le stub auth.js.
//
// ⚠️ À SUPPRIMER avec les stubs auth.js et roles.js dès que les vrais
// fichiers sont disponibles dans le dépôt de l'équipe.

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FAKE_USER_ID = "00000000-0000-0000-0000-000000000001";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.STRING(30), allowNull: false },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
  }
);

User.FAKE_USER_ID = FAKE_USER_ID;

// Exécuté juste après la création de la table "users" (donc avant celle
// de "parcelles", qui en dépend).
User.afterSync(async () => {
  await User.findOrCreate({
    where: { id: FAKE_USER_ID },
    defaults: { email: "promoteur.test@local", role: "PROMOTEUR" },
  });
});

module.exports = User;
