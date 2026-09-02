const express = require("express");
const router = express.Router();

const parcelleController = require("../controllers/parcelleController");
const { handleParcelleUpload } = require("../middleware/upload");

// NOTE : le middleware d'auth (auth.js, roles.js) est la propriété de
// Carla. Une fois disponible dans le repo, protège ces routes avec
// verifyToken + requireRole('PROMOTEUR').

router.post("/", parcelleController.creerParcelle);
router.get("/", parcelleController.listerParcelles);
router.get("/:id", parcelleController.obtenirParcelle);
router.post(
  "/:id/soumettre",
  handleParcelleUpload,
  parcelleController.soumettreParcelle
);

module.exports = router;

/*
 * Rappel (section 3 du doc d'équipe) : dans backend/src/routes/index.js
 * (propriété de Carla), ajouter UNE seule ligne :
 *
 *   router.use('/parcelles', require('./parcelleRoutes'));
 *
 * Ne pas mettre de logique dans index.js.
 */
