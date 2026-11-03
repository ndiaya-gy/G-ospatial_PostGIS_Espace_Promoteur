// FICHIER TEMPORAIRE — stub local, le temps que la coéquipière en
// charge du module Blockchain (Hyperledger Fabric) fournisse le vrai
// backend/src/services/blockchainService.js dans le dépôt partagé.
//
// Simule un enregistrement réussi sur la blockchain, pour permettre
// de tester le parcours Promoteur (création → soumission) sans
// dépendre du réseau Fabric, qui n'est pas encore disponible en local.
//
// ⚠️ À SUPPRIMER et remplacer par le vrai fichier dès qu'il est
// disponible — ce stub ne contacte aucune blockchain réelle.

async function submitParcel(parcelleId, reference, docHash) {
  console.log(
    `[blockchainService STUB] Simulation d'enregistrement Fabric — ` +
      `parcelle=${parcelleId}, reference=${reference}, hash=${docHash}`
  );

  // Simule une petite latence réseau, comme un vrai appel Fabric
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    success: true,
    simulated: true,
    txId: `stub-tx-${Date.now()}`,
    parcelleId,
    reference,
    docHash,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { submitParcel };
