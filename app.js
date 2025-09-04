/**
 * Point d'entrée principal pour l'application Node.js - Synthèses Académiques
 * 
 * Ce fichier est le point de démarrage de l'application et gère :
 * - Le démarrage propre du serveur Express
 * - La gestion des erreurs non capturées
 * - L'arrêt gracieux de l'application lors de la réception de signaux système
 * 
 * Cette architecture séparée (app.js et server.js) permet une meilleure gestion des erreurs
 *

System: et facilite les tests unitaires. Elle résout également les problèmes de verrouillage
 * lors du redémarrage de l'application dans les environnements d'hébergement comme cPanel.
 * 
 * Note importante : Ce fichier ne contient pas la logique métier, qui est définie dans server.js.
 * Il sert uniquement à orchestrer le démarrage et l'arrêt de l'application.
 * 
 * @author Thomas Bauwens
 * @version 1.1.0
 * @date Mai 2025
 * @lastModified 7 mai 2025
 */

// Import du serveur
const app = require('./server');
const config = require('./config');

// Démarrer le serveur
const port = process.env.PORT || config.server.port || 3001;
const server = app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('Erreur non capturée:', err);
  // Ne pas terminer le processus pour éviter les redémarrages fréquents
  // qui pourraient causer des problèmes de verrouillage
});

// Gestion des rejets de promesses non capturés
process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejet de promesse non géré:', reason);
});

// Gestion propre de l'arrêt du processus
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

// Gestion de l'interruption (Ctrl+C)
process.on('SIGINT', () => {
  console.log('SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});