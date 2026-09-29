const { Sequelize } = require("sequelize");
require("dotenv").config();

// Connexion à la base PostGIS lancée via docker-compose.postgis.yml
// Ce fichier est temporaire : une fois que Carla fournit le vrai
// backend/src/config/db.js du projet, remplace cet import partout
// (models/Parcelle.js, models/Document.js) par le sien pour éviter
// d'avoir deux connexions différentes à la base.

const sequelize = new Sequelize(
  process.env.DB_NAME || "foncier_geo_dev",
  process.env.DB_USER || "foncier",
  process.env.DB_PASSWORD || "foncier_dev_pwd",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // passe à console.log pour voir le SQL généré
  }
);

module.exports = sequelize;
