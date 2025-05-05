/**
 * Script de déploiement FTP pour LWS
 * 
 * Ce script permet de déployer l'application sur un hébergement LWS via FTP
 * Nécessite le module ftp-deploy: npm install ftp-deploy --save-dev
 */

const FtpDeploy = require('ftp-deploy');
const ftpDeploy = new FtpDeploy();

// Configuration du déploiement
// Remplacez ces valeurs par vos informations LWS
// Chargement des informations sensibles depuis un fichier séparé
// Créez un fichier ftp-credentials.js avec vos identifiants réels
let credentials = {};
try {
    credentials = require('./ftp-credentials.js');
} catch (err) {
    console.error('Fichier ftp-credentials.js manquant. Utilisez les identifiants par défaut.');
}

const config = {
    user: credentials.user || "belga2547107", // Nom d'utilisateur FTP
    password: credentials.password || "", // Mot de passe FTP
    host: credentials.host || "ftp.belgacai.com", // Adresse du serveur FTP
    port: 21, // Port FTP standard
    localRoot: __dirname, // Dossier local à déployer
    remoteRoot: "/www/", // Dossier distant sur le serveur LWS
    include: ['*', '**/*'], // Inclure tous les fichiers et dossiers
    exclude: [
        "node_modules/**", // Exclure les modules Node.js
        ".git/**", // Exclure les fichiers Git
        "deploy.js", // Exclure ce script
        ".gitignore", // Exclure le fichier .gitignore
        "README.md", // Exclure le README
        "config.example.js" // Exclure l'exemple de configuration
    ],
    deleteRemote: false, // Ne pas supprimer les fichiers distants
    forcePasv: false, // Désactiver le mode PASV forcé
    useEpsv: true // Utiliser EPSV pour les connexions IPv6
};

// Lancement du déploiement
ftpDeploy.deploy(config)
    .then(res => console.log('Déploiement terminé!'))
    .catch(err => console.log(err));

// Événements pour suivre la progression
ftpDeploy.on('uploading', function(data) {
    console.log(`Transfert de ${data.filename} [${data.transferredFileCount}/${data.totalFilesCount}]`);
});

ftpDeploy.on('uploaded', function(data) {
    console.log(`Fichier ${data.filename} transféré avec succès`);
});

ftpDeploy.on('log', function(data) {
    console.log(data);
});

ftpDeploy.on('upload-error', function(data) {
    console.log(data.err);
});
