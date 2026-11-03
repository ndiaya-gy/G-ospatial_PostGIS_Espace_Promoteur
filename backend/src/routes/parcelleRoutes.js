const express = require("express");
const router = express.Router();

const parcelleController = require("../controllers/parcelleController");
const { handleParcelleUpload } = require("../middleware/upload");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/roles");

// Toutes les routes exigent un utilisateur connecté (JWT).
router.use(auth);

// --- CRUD parcelle (Promoteur) ---
router.post("/", checkRole("PROMOTEUR"), parcelleController.creerParcelle);
router.get("/", checkRole("PROMOTEUR"), parcelleController.listerParcelles);
router.put("/:id", checkRole("PROMOTEUR"), parcelleController.modifierParcelle);
router.delete("/:id", checkRole("PROMOTEUR"), parcelleController.supprimerParcelle);

// --- Documents et soumission (cahier section 6) ---
router.post(
  "/:id/documents",
  checkRole("PROMOTEUR"),
  handleParcelleUpload,
  parcelleController.ajouterDocument
);
router.put("/:id/soumettre", checkRole("PROMOTEUR"), parcelleController.soumettreParcelle);

// --- Lecture : accessible aux trois rôles ---
router.get(
  "/:id/controle-geo",
  checkRole("PROMOTEUR", "CADASTRE", "NOTAIRE"),
  parcelleController.controleGeo
);
router.get("/:id", checkRole("PROMOTEUR", "CADASTRE", "NOTAIRE"), parcelleController.obtenirParcelle);

module.exports = router;
