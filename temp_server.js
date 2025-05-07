/**
 * Serveur Node.js temporaire pour visualisation
 * Version simplifiée pour démonstration
 */

const express = require('express');
const path = require('path');

// Configuration de base
const app = express();
const port = 3000;

// Configuration pour servir les fichiers statiques
app.use(express.static(__dirname));

// Route racine pour servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrage du serveur sur le port spécifié
app.listen(port, () => {
  console.log(`Serveur de démonstration démarré sur http://localhost:${port}`);
});
