/**
 * Exemple de fichier de configuration
 * Copiez ce fichier vers config.js et remplacez les valeurs par vos propres informations
 */

module.exports = {
  // Configuration SMTP pour l'envoi d'emails
  smtp: {
    host: 'smtp.example.com',      // Adresse du serveur SMTP
    port: 465,                     // Port SMTP sécurisé (SSL)
    secure: true,                  // Utilise une connexion sécurisée (SSL/TLS)
    auth: {
      user: 'user@example.com',    // Adresse email de l'expéditeur
      pass: 'your_password_here'   // Mot de passe de l'adresse email
    }
  },
  
  // Autres configurations sensibles peuvent être ajoutées ici
  server: {
    port: 3000                     // Port du serveur
  }
};
