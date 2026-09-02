-- Activation de PostGIS sur la base de dev.
-- Exécuté automatiquement au premier démarrage du conteneur.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Vérification rapide (visible dans les logs docker au démarrage)
SELECT postgis_full_version();
