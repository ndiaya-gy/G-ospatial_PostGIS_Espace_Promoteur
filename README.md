# FoncierSûr — Module Géospatial PostGIS & Espace Promoteur

Module en charge de : gestion des parcelles (géométrie, validation
spatiale) et de l'espace Promoteur (dessin, soumission, upload de
documents).

## Installation

### 1. Base de données PostGIS (Docker)

```bash
docker compose -f docker-compose.postgis.yml up -d
```

Vérifie que PostGIS est actif :

```bash
docker exec -it foncier-postgis-dev psql -U foncier -d foncier_geo_dev -c "SELECT postgis_full_version();"
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # à créer avec Carla — ne pas modifier son .env directement
npm run dev
```

Variables d'environnement attendues (à ajouter dans `.env.example`,
jamais directement dans le `.env` de quelqu'un d'autre) :

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foncier_geo_dev
DB_USER=foncier
DB_PASSWORD=foncier_dev_pwd
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Structure

Voir `docs/repartition-equipe.md` pour la répartition complète de
l'équipe et les règles anti-conflits Git.

```
backend/src/
  config/upload.js
  middleware/upload.js
  models/Parcelle.js
  models/Document.js
  services/geospatialService.js   # ST_Intersects, ST_Area, ST_IsValid
  services/documentService.js     # Hash SHA-256
  controllers/parcelleController.js
  routes/parcelleRoutes.js

frontend/src/
  components/maps/ParcelleMap.tsx  # COMPOSANT PARTAGÉ — gelé une fois stable
  pages/Promoteur/
    Dashboard.tsx
    CreateParcelle.tsx
    ParcelleDetail.tsx
    SoumettreParcelle.tsx
```

## Règles Git (rappel)

- Une branche par module : `feature/geospatial-*`, jamais de commit
  direct sur `main`.
- `ParcelleMap.tsx` est un fichier partagé (utilisé aussi par le
  Cadastre) : une fois stabilisé, toute modification passe par une
  Pull Request.
- Nouvelle route backend → une seule ligne dans
  `backend/src/routes/index.js` (propriété de Carla), pas de logique
  ajoutée là-bas.
