const express = require("express");
require("dotenv").config();

const sequelize = require("./config/db");
const parcelleRoutes = require("./routes/parcelleRoutes");

// Import des modèles pour que Sequelize connaisse les tables
// avant de faire sync() (sinon les tables ne sont pas créées).
require("./models/Parcelle");
require("./models/Document");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Petite route de "faux" middleware d'auth, le temps que celui de
// Carla soit disponible. À SUPPRIMER une fois branché sur le vrai.
app.use((req, res, next) => {
  req.user = { id: "00000000-0000-0000-0000-000000000001" };
  next();
});

app.use("/api/v1/parcelles", parcelleRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API Géospatial & Promoteur - serveur de test OK" });
});

async function demarrer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion à PostGIS réussie");

    // sync({ alter: true }) crée/ajuste les tables automatiquement.
    // Pratique en dev, à ne JAMAIS utiliser en production.
    await sequelize.sync({ alter: true });
    console.log("✅ Tables synchronisées (parcelles, documents)");

    app.listen(PORT, () => {
      console.log(`🚀 Serveur de test lancé sur http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Erreur au démarrage :", err.message);
  }
}

demarrer();
