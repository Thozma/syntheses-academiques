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
    remoteRoot: "nodeapp/", // Dossier distant dédié pour Node.js
    include: ['*', '**/*'], // Inclure tous les fichiers et dossiers
    exclude: [
        "**/node_modules/**", // Exclure tous les dossiers node_modules et leur contenu
        "node_modules", // Exclure le dossier node_modules à la racine
        ".git/**", // Exclure les fichiers Git
        "deploy.js", // Exclure ce script
        ".gitignore", // Exclure le fichier .gitignore
        "README.md", // Exclure le README
        "config.example.js", // Exclure l'exemple de configuration
        "app.js.lock", // Exclure le fichier de verrouillage s'il existe
        // Note: .htaccess et install.js ne sont PAS exclus car ils sont nécessaires pour CloudLinux
    ],
    deleteRemote: false, // Ne pas supprimer les fichiers distants
    forcePasv: false, // Désactiver le mode PASV forcé
    useEpsv: true // Utiliser EPSV pour les connexions IPv6
};

// Lancement du déploiement
ftpDeploy.deploy(config)
    .then(res => console.log('Déploiement terminé!'))
    .catch(err => {
        // Ignorer l'erreur si c'est juste un répertoire qui existe déjà
        if (err.code === 550 && err.message && err.message.includes("Can't create directory: File exists")) {
            console.log('Avertissement: Certains répertoires existent déjà sur le serveur. Le déploiement continue.');
            console.log('Déploiement terminé avec des avertissements!');
        } else {
            console.log(err);
        }
    });

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
