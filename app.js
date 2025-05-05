/**
 * Point d'entrée principal pour l'application Node.js
 * Ce fichier gère le démarrage propre de l'application et la gestion des erreurs
 * 
 * @author Thomas Bauwens
 * @version 1.0.0
 * @date Mai 2025
 */

// Import du serveur
const server = require('./server');

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
