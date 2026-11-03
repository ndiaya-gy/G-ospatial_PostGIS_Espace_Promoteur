const express = require("express");
const cors = require("cors");
require("dotenv").config();

const sequelize = require("./config/db");
const parcelleRoutes = require("./routes/parcelleRoutes");

// Import des modèles pour que Sequelize connaisse les tables
// avant de faire sync() (sinon les tables ne sont pas créées).
// Le faux modèle User est chargé par le stub middleware/auth.js.
require("./models/Parcelle");
require("./models/Document");

const app = express();
const PORT = process.env.PORT || 4000;

// Autorise les requêtes venant du frontend Vite (port 5173).
app.use(cors({ origin: "http://localhost:5173" }));

app.use(express.json());

// Log simple de chaque requête entrante, utile pour déboguer.
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/v1/parcelles", parcelleRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API Géospatial & Promoteur - serveur de test OK" });
});

async function demarrer() {
  try {
    await sequelize.authenticate();
    console.log("Connexion à PostGIS réussie");

    // force: true recrée les tables à chaque démarrage (développement
    // uniquement : les données de test sont effacées).
    await sequelize.sync({ force: true });
    console.log("Tables synchronisées");

    app.listen(PORT, () => {
      console.log(`Serveur de test lancé sur http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Erreur au démarrage :", err.message);
  }
}

demarrer();
