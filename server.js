/**
 * Serveur Node.js pour la gestion d'un site de partage de synthèses académiques
 * 
 * Ce serveur est le cœur de l'application de partage de synthèses académiques pour
 * les étudiants de première année en informatique de la Haute Ecole Léonard de Vinci.
 * 
 * Fonctionnalités principales :
 * - Gestion des uploads de fichiers (PDF, ZIP)
 * - Conversion entre types de fichiers (PDF/ZIP vers liens vidéo)
 * - Stockage et récupération des métadonnées des fichiers
 * - Envoi d'emails via le formulaire de contact
 * - Authentification pour le panneau d'administration
 * - Serveur de fichiers statiques (HTML, CSS, JS, fichiers téléchargeables)
 * 
 * Architecture :
 * - Express.js pour le routage et le middleware
 * - Multer pour la gestion des uploads de fichiers
 * - Nodemailer pour l'envoi d'emails
 * - Stockage des métadonnées dans fichiers.json
 * - Stockage des fichiers physiques dans le système de fichiers
 * 
 * @author Thomas Bauwens
 * @version 1.1.0
 * @date Mai 2025
 * @lastModified 7 mai 2025
 */

// ========== IMPORTS DES MODULES ==========
const express = require('express');      // Framework web pour Node.js
const multer = require('multer');       // Middleware pour gérer les uploads de fichiers
const path = require('path');           // Module pour manipuler les chemins de fichiers
const fs = require('fs');               // Module pour interagir avec le système de fichiers
const nodemailer = require('nodemailer'); // Module pour envoyer des emails

// Import de la configuration sécurisée
const config = require('./config');     // Fichier de configuration avec les données sensibles

// ========== CONFIGURATION DE BASE ==========
const app = express();                  // Création de l'application Express

// Servir les fichiers statiques
// Configuration des middlewares
app.use(express.static(__dirname));
app.use(express.json());    // Pour parser le JSON
app.use(express.urlencoded({ extended: true })); // Pour parser les données de formulaire

// Route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour éditer un fichier
app.post('/edit-file', async (req, res) => {
  try {
    const { id, type, titre, cours, nomDiscord, description, url } = req.body;
    const fichiersPath = path.join(__dirname, 'fichiers.json');
    
    // Lire le fichier JSON
    const fichiers = JSON.parse(fs.readFileSync(fichiersPath, 'utf8'));
    
    // Trouver le fichier à modifier
    const fileIndex = fichiers.findIndex(f => f.id === id);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    
    const file = fichiers[fileIndex];
    const oldPath = file.path;
    
    // Si le cours a changé, déplacer le fichier
    if (cours && cours !== file.cours && file.path) {
      const oldFilePath = path.join(__dirname, file.path);
      const newPath = `/Les synthèses des invités/${cours}/${file.nomFichier}`;
      const newFilePath = path.join(__dirname, newPath);
      
      // Créer le dossier du cours s'il n'existe pas
      const coursDir = path.join(__dirname, 'Les synthèses des invités', cours);
      if (!fs.existsSync(coursDir)) {
        fs.mkdirSync(coursDir, { recursive: true });
      }
      
      // Déplacer le fichier
      if (fs.existsSync(oldFilePath)) {
        fs.renameSync(oldFilePath, newFilePath);
        file.path = newPath;
      }
    }
    
    // Mettre à jour les métadonnées
    Object.assign(file, {
      type: type || file.type,
      titre: titre || file.titre,
      cours: cours || file.cours,
      nomDiscord: nomDiscord || file.nomDiscord,
      description: description || file.description,
      url: url || file.url
    });
    
    // Sauvegarder le fichier JSON
    fs.writeFileSync(fichiersPath, JSON.stringify(fichiers, null, 2));
    
    res.json({ success: true, message: 'Fichier modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification:', error);
    res.status(500).json({ success: false, message: 'Une erreur est survenue lors de la modification du fichier' });
  }
});

// Exporter l'app pour app.js
module.exports = app;

// Route pour supprimer un fichier
app.delete('/delete-file/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const fichiersPath = path.join(__dirname, 'fichiers.json');
    
    // Lire le fichier JSON
    const fichiers = JSON.parse(fs.readFileSync(fichiersPath, 'utf8'));
    
    // Trouver le fichier à supprimer
    const fileIndex = fichiers.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.json({ success: false, message: 'Fichier non trouvé' });
    }
    
    const file = fichiers[fileIndex];
    
    // Supprimer le fichier physique
    if (file.path) {
      const filePath = path.join(__dirname, file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Supprimer l'entrée du JSON
    fichiers.splice(fileIndex, 1);
    
    // Sauvegarder le fichier JSON
    fs.writeFileSync(fichiersPath, JSON.stringify(fichiers, null, 2));
    
    res.json({ success: true, message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.json({ success: false, message: error.message });
  }
});

// Route pour l'admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Exporter l'application
module.exports = app;


// Fonction pour obtenir le prochain ID disponible
function getNextAvailableId() {
  try {
    const fileData = fs.readFileSync('fichiers.json', 'utf8');
    const files = JSON.parse(fileData);
    if (files.length === 0) return 1;
    const maxId = Math.max(...files.map(file => file.id));
    return maxId + 1;
  } catch (error) {
    console.error('Erreur lors de la lecture des IDs:', error);
    return 1;
  }
}

// Configuration pour servir les fichiers statiques et parser les requêtes
app.use(express.static(__dirname));    // Sert les fichiers du répertoire courant
app.use('/Les synthèses des invités', express.static(path.join(__dirname, 'Les synthèses des invités'))); // Sert les fichiers uploadés

// Middleware pour traiter les données JSON et formulaires
app.use(express.json());               // Parse les requêtes avec JSON payload
app.use(express.urlencoded({ extended: true })); // Parse les requêtes avec URL-encoded payload

// Route racine pour servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour la page d'administration
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ========== CONFIGURATION DES DOSSIERS ==========
// Vérifier si le dossier principal existe et le créer si nécessaire
const mainDir = 'Les synthèses des invités';
if (!fs.existsSync(mainDir)) {
  fs.mkdirSync(mainDir, { recursive: true });
}

// ========== CONFIGURATION DE MULTER POUR L'UPLOAD DE FICHIERS ==========
/**
 * Configuration du stockage des fichiers uploadés avec Multer
 * Définit où et comment les fichiers seront stockés sur le serveur
 */
const storage = multer.diskStorage({
  /**
   * Détermine le dossier de destination pour les fichiers uploadés
   * Crée automatiquement un sous-dossier pour chaque cours si nécessaire
   * 
   * @param {Object} req - L'objet requête HTTP
   * @param {Object} file - L'objet fichier uploadé
   * @param {Function} cb - Fonction de callback
   */
  destination: function (req, file, cb) {
    // Assurons-nous que le cours existe et est valide, avec une valeur par défaut
    const cours = req.body.cours || 'Divers';
    const dir = path.join(__dirname, 'Les synthèses des invités', cours);
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir); // Passe le chemin de destination à Multer
  },
  
  /**
   * Détermine le nom du fichier uploadé
   * Génère un nom de fichier avec des informations utiles (cours, titre, auteur, taille, date)
   * 
   * @param {Object} req - L'objet requête HTTP
   * @param {Object} file - L'objet fichier uploadé
   * @param {Function} cb - Fonction de callback
   */
  filename: function (req, file, cb) {
    // Récupération des données du formulaire avec valeurs par défaut
    const cours = req.body.cours || 'Divers';
    const titre = req.body.titre || 'Sans titre';
    const nomDiscord = req.body.nomDiscord || 'Anonyme';
    const fileSize = file.size / 1048576; // Conversion de la taille en MB
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    
    // Sécurisation des noms en remplaçant les caractères problématiques par des underscores
    const secureTitre = titre.replace(/[\/:\*?"<>|]/g, '_');
    const secureNomDiscord = nomDiscord.replace(/[\/:\*?"<>|]/g, '_');
    const secureCours = cours.replace(/[\/:\*?"<>|]/g, '_');
    
    // Détermination de l'extension du fichier en fonction du type d'upload
    const uploadType = req.body.uploadType || 'pdf';
    let extension = '.pdf';
    
    if (uploadType === 'zip') {
      extension = '.zip';
    } else if (file.originalname) {
      // Si le fichier a un nom original, on utilise son extension
      const originalExtension = path.extname(file.originalname).toLowerCase();
      if (originalExtension === '.pdf' || originalExtension === '.zip') {
        extension = originalExtension;
      }
    }
    
    // Génération du nom de fichier complet avec la bonne extension
    const fileName = `${secureCours}_${secureTitre}_${secureNomDiscord}_${date}${extension}`;
    cb(null, fileName);
  }
});

/**
 * Configuration complète de Multer avec filtrage des types de fichiers et limites
 */
const upload = multer({
  storage: storage, // Utilise la configuration de stockage définie ci-dessus
  
  /**
   * Filtre les fichiers pour n'accepter que les PDF et ZIP
   * 
   * @param {Object} req - L'objet requête HTTP
   * @param {Object} file - L'objet fichier uploadé
   * @param {Function} cb - Fonction de callback
   */
  fileFilter: function (req, file, cb) {
    // Vérifie le type MIME du fichier pour accepter PDF et ZIP
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed') {
      // Accepte le fichier
      cb(null, true);
    } else {
      // Rejette le fichier
      return cb(new Error('Seuls les fichiers PDF et ZIP sont acceptés'), false);
    }
  },
  
  // Limite la taille des fichiers à 20 MB
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  }
});

// ========== CONFIGURATION DE NODEMAILER POUR L'ENVOI D'EMAILS ==========
/**
 * Configuration du transporteur d'emails avec Nodemailer
 */
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.auth.user,
    pass: config.smtp.auth.pass
  }
});

// Adresse email de l'expéditeur (pour la réutiliser dans différentes routes)
const emailSender = config.smtp.auth.user;

// Importation du module archiver pour créer des fichiers ZIP
const archiver = require('archiver');

/**
 * Crée un fichier ZIP à partir de plusieurs fichiers
 * 
 * @param {Array} files - Liste des fichiers à inclure dans le ZIP
 * @param {string} outputPath - Chemin de sortie du fichier ZIP
 * @returns {Promise} - Promise résolue lorsque le ZIP est créé
 */
function createZipFromFiles(files, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Vérification que files est un tableau valide
      if (!Array.isArray(files) || files.length === 0) {
        throw new Error('Aucun fichier valide à inclure dans l\'archive');
      }

      // Vérification du répertoire de destination
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Création du flux de sortie pour le fichier ZIP
      const output = fs.createWriteStream(outputPath);
      
      // Création de l'archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Niveau de compression maximum
      });
      
      // Gestion des événements
      output.on('close', () => {
        console.log(`Archive créée avec succès: ${archive.pointer()} octets`);
        resolve(outputPath);
      });
      
      output.on('error', (err) => {
        console.error('Erreur sur le flux de sortie:', err);
        reject(err);
      });
      
      archive.on('error', (err) => {
        console.error('Erreur lors de la création de l\'archive:', err);
        reject(err);
      });
      
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('Avertissement archiver:', err);
        } else {
          console.error('Erreur archiver:', err);
          reject(err);
        }
      });
      
      // Connexion de l'archive au flux de sortie
      archive.pipe(output);
      
      // Comptage des fichiers valides
      let validFilesCount = 0;
      
      // Ajout des fichiers à l'archive
      files.forEach((file, index) => {
        // Vérification que le fichier existe et a les propriétés nécessaires
        if (file && file.path && fs.existsSync(file.path)) {
          try {
            // Utilisation du nom original du fichier ou du nom du fichier si originalname n'est pas disponible
            const fileName = file.originalname || path.basename(file.path);
            console.log(`[${index + 1}/${files.length}] Ajout du fichier ${fileName} à l'archive`);
            archive.file(file.path, { name: fileName });
            validFilesCount++;
          } catch (fileError) {
            console.error(`Erreur lors de l'ajout du fichier ${file.path} à l'archive:`, fileError);
          }
        } else {
          console.warn(`Fichier ignoré car invalide ou introuvable: ${file ? file.path : 'undefined'}`);
        }
      });
      
      // Vérification qu'au moins un fichier valide a été ajouté
      if (validFilesCount === 0) {
        throw new Error('Aucun fichier valide n\'a pu être ajouté à l\'archive');
      }
      
      console.log(`Finalisation de l'archive avec ${validFilesCount} fichiers valides`);
      // Finalisation de l'archive
      archive.finalize();
      
    } catch (error) {
      console.error('Erreur lors de la création du ZIP:', error);
      // Si un fichier de sortie a été créé mais est incomplet, on le supprime
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          console.log(`Fichier ZIP incomplet supprimé: ${outputPath}`);
        } catch (unlinkError) {
          console.error(`Erreur lors de la suppression du fichier ZIP incomplet:`, unlinkError);
        }
      }
      reject(error);
    }
  });
}

/**
 * Route pour l'upload de fichiers
 * Gère l'upload de fichiers PDF et l'enregistrement des métadonnées
 * 
 * @route POST /upload
 * @param {Object} req - Requête HTTP contenant le fichier et les données du formulaire
 * @param {Object} res - Réponse HTTP
 */
// Middleware pour parser le JSON
app.use(express.json());

// Configuration de multer pour les uploads multiples
const uploadMulti = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // Crée un dossier temporaire pour stocker les fichiers
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: function (req, file, cb) {
      // Conserve le nom original du fichier
      cb(null, file.originalname);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB par fichier
    files: 20 // Maximum 20 fichiers
  }
});

/**
 * Route pour l'upload de plusieurs fichiers
 * Gère l'upload de plusieurs fichiers, les assemble en un ZIP et enregistre les métadonnées
 * 
 * @route POST /upload-multi
 * @param {Object} req - Requête HTTP contenant les fichiers et les données du formulaire
 * @param {Object} res - Réponse HTTP
 */
app.post('/upload-multi', uploadMulti.array('fichiers'), async (req, res) => {
  try {
    // Vérification que des fichiers ont bien été reçus
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier n\'a été téléchargé' });
    }
    
    console.log(`${files.length} fichiers reçus pour l'assemblage`);
    
    // Récupération des données du formulaire
    const cours = req.body.cours || 'Divers';
    const titre = req.body.titre || 'Sans titre';
    const nomDiscord = req.body.nomDiscord || 'Anonyme';
    const description = req.body.description || '';
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    
    // Sécurisation des noms
    const secureTitre = titre.replace(/[\/:\*?"<>|]/g, '_');
    const secureNomDiscord = nomDiscord.replace(/[\/:\*?"<>|]/g, '_');
    const secureCours = cours.replace(/[\/:\*?"<>|]/g, '_');
    
    // Création du dossier de destination
    const destDir = path.join(__dirname, 'Les synthèses des invités', cours);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Création du nom du fichier ZIP final
    const zipFileName = `${secureCours}_${secureTitre}_${secureNomDiscord}_${date}.zip`;
    const zipFilePath = path.join(destDir, zipFileName);
    
    // Création du ZIP à partir des fichiers uploadés
    await createZipFromFiles(files, zipFilePath);
    
    // Calcul de la taille totale du ZIP
    const zipStats = fs.statSync(zipFilePath);
    const zipSize = zipStats.size;
    
    // Récupération du prochain ID disponible
    const nextId = getNextAvailableId();
    
    // Création des métadonnées du fichier
    const fileMetadata = {
      id: nextId,
      type: 'zip',
      path: `/Les synthèses des invités/${cours}/${zipFileName}`,
      nomFichier: zipFileName,
      cours: cours,
      titre: titre,
      nomDiscord: nomDiscord,
      description: description,
      poidsFichier: zipSize,
      dateAjout: new Date().toLocaleDateString('fr-FR')
    };
    
    // Mise à jour du fichier JSON
    let fileList = [];
    const jsonPath = path.join(__dirname, 'fichiers.json');
    
    if (fs.existsSync(jsonPath)) {
      try {
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        fileList = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Erreur lors du parsing du fichier JSON:', parseError);
      }
    }
    
    // Ajout des métadonnées du nouveau fichier
    fileList.push(fileMetadata);
    
    // Sauvegarde du fichier JSON mis à jour
    fs.writeFileSync(jsonPath, JSON.stringify(fileList, null, 2));
    
    // Nettoyage des fichiers temporaires
    files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error(`Erreur lors de la suppression du fichier temporaire ${file.path}:`, unlinkError);
      }
    });
    
    // Envoi d'un email de notification
    try {
      await transporter.sendMail({
        from: `Thomas Bauwens <${emailSender}>`,
        to: emailSender,
        subject: `Nouveau fichier assemblé ajouté: ${titre}`,
        text: `Un nouveau fichier assemblé a été ajouté:\n\nCours: ${cours}\nTitre: ${titre}\nAuteur: ${nomDiscord}\nNombre de fichiers: ${files.length}\nDescription: ${description || 'Aucune description'}`
      });
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
    }
    
    // Réponse de succès
    res.json({
      success: true,
      message: `Fichier assemblé créé par ${nomDiscord} : ${titre} (${files.length} fichiers)`
    });
    
  } catch (error) {
    console.error('Erreur lors du traitement des fichiers multiples:', error);
    res.status(500).json({
      error: 'Une erreur est survenue lors de l\'assemblage des fichiers'
    });
  }
});

// Route pour modifier un fichier
app.post('/edit-file', async (req, res) => {
  try {
    const { id, type, titre, cours, nomDiscord, description, url } = req.body;
    
    // Lire le fichier JSON
    const jsonPath = path.join(__dirname, 'fichiers.json');
    const fileData = fs.readFileSync(jsonPath, 'utf8');
    const files = JSON.parse(fileData);
    
    // Trouver le fichier à modifier
    const fileIndex = files.findIndex(f => f.id === id);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    
    const oldFile = files[fileIndex];
    const oldPath = path.join(__dirname, oldFile.path);
    
    // Si les métadonnées ont changé, on doit renommer/déplacer le fichier
    if (cours !== oldFile.cours || type !== oldFile.type || titre !== oldFile.titre || nomDiscord !== oldFile.nomDiscord) {
      // Créer le nouveau dossier si nécessaire
      const newDir = path.join(__dirname, 'Les synthèses des invités', cours);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }
      
      // Générer le nouveau nom de fichier
      const extension = type === 'video' ? '' : (type === 'zip' ? '.zip' : '.pdf');
      const newFileName = `${cours}_${titre}_${nomDiscord}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}${extension}`;
      const newPath = path.join(newDir, newFileName);
      
      // Si c'est un fichier physique (pas une vidéo), le déplacer
      if (oldFile.type !== 'video' && type !== 'video') {
        fs.renameSync(oldPath, newPath);
      }
      
      // Mettre à jour le chemin dans les métadonnées
      files[fileIndex].path = `/Les synthèses des invités/${cours}/${newFileName}`;
    }
    
    // Mettre à jour les métadonnées
    files[fileIndex] = {
      ...oldFile,
      type,
      titre,
      cours,
      nomDiscord,
      description,
      url: type === 'video' ? url : undefined
    };
    
    // Sauvegarder les modifications
    fs.writeFileSync(jsonPath, JSON.stringify(files, null, 2));
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Erreur lors de la modification du fichier:', error);
    res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la modification du fichier'
    });
  }
});

app.post('/upload', async (req, res) => {
  // Obtenir le prochain ID disponible
  const nextId = getNextAvailableId();
  // Utiliser une approche différente pour déterminer le type d'upload
  // Nous allons d'abord vérifier si c'est un upload de fichier ou de vidéo
  // en examinant le content-type de la requête
  
  const contentType = req.headers['content-type'] || '';
  console.log('Content-Type de la requête:', contentType);
  
  // Si la requête contient 'application/json', c'est un upload de vidéo
  if (contentType.includes('application/json')) {
    console.log('Traitement d\'une requête JSON pour vidéo:', req.body);
    // Traitement pour les liens vidéo
    handleVideoUpload(req, res);
  }
  // Si la requête contient 'multipart/form-data', c'est un upload de fichier
  else if (contentType.includes('multipart/form-data')) {
    // Pour les uploads de fichiers, utiliser upload.single
    upload.single('fichier')(req, res, async (err) => {
      // Gestion des erreurs d'upload (taille, format, etc.)
      if (err) {
        console.error('Erreur upload PDF:', err);
        return res.status(400).json({
          error: err.message || 'Erreur lors du téléchargement du fichier'
        });
      }

      try {
        // Vérification que le fichier a bien été reçu
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'Aucun fichier n\'a été téléchargé' });
        }

        // Déterminer le type de fichier en fonction de l'extension du fichier
        const fileExtension = path.extname(file.filename).toLowerCase();
        console.log('Extension du fichier:', fileExtension);
        
        // Déterminer le type de fichier en fonction de l'extension
        let fileType;
        if (fileExtension === '.pdf') {
          fileType = 'pdf';
        } else if (fileExtension === '.zip') {
          fileType = 'zip';
        } else {
          return res.status(400).json({ 
            error: `Type de fichier non pris en charge: ${fileExtension}. Seuls les fichiers PDF et ZIP sont acceptés.` 
          });
        }
        
        console.log('Type de fichier détecté:', fileType);

        /**
         * Création des métadonnées du fichier
         * Ces métadonnées seront stockées dans un fichier JSON et utilisées pour afficher la liste des fichiers
         */
        const fileMetadata = {
          id: nextId,
          type: fileType,
          path: `/Les synthèses des invités/${req.body.cours}/${file.filename}`,
          nomFichier: file.filename,
          cours: req.body.cours,
          titre: req.body.titre,
          nomDiscord: req.body.nomDiscord,
          description: req.body.description || '',
          poidsFichier: file.size,
          dateAjout: new Date().toLocaleDateString('fr-FR')
        };

        /**
         * Mise à jour du fichier JSON contenant la liste des fichiers
         * Ce fichier est utilisé pour générer la liste des synthèses sur la page d'accueil
         */
        let fileList = [];
        // Utiliser un chemin absolu pour fichiers.json
        const jsonPath = path.join(__dirname, 'fichiers.json');
        console.log('Chemin du fichier JSON pour l\'upload:', jsonPath);
        
        // Charger la liste existante si le fichier existe déjà
        if (fs.existsSync(jsonPath)) {
          const fileContent = fs.readFileSync(jsonPath, 'utf8');
          try {
            fileList = JSON.parse(fileContent);
          } catch (parseError) {
            console.error('Erreur lors du parsing du fichier JSON:', parseError);
            fileList = [];
          }
        }

        // Ajouter le nouveau fichier à la liste
        fileList.push(fileMetadata);
        
        // Sauvegarder la liste mise à jour
        fs.writeFileSync(jsonPath, JSON.stringify(fileList, null, 2));
        console.log('Fichier JSON mis à jour avec succès');

        /**
         * Envoi d'un email de notification pour informer de l'ajout d'un nouveau fichier
         */
        try {
          // Utilisation de la variable globale emailSender définie plus haut
          console.log('Route /upload: Utilisation de l\'adresse email:', emailSender);
          
          await transporter.sendMail({
            from: `Thomas Bauwens <${emailSender}>`,
            to: emailSender,
            subject: `Nouvelle synthèse ajoutée: ${req.body.titre}`,
            text: `Une nouvelle synthèse a été ajoutée:
            
Cours: ${req.body.cours}
Titre: ${req.body.titre}
Auteur: ${req.body.nomDiscord}
Description: ${req.body.description || 'Aucune description'}
Taille: ${(file.size / 1048576).toFixed(2)} MB
Chemin: ${file.path}`
          });
          console.log('Email de notification envoyé avec succès');
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
          // On continue malgré l'erreur d'email car le fichier a bien été uploadé
        }

        res.json({
          success: true,
          message: `Synthèse ajoutée par ${req.body.nomDiscord} : ${req.body.titre}`
        });

      } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({
          error: 'Une erreur est survenue lors du téléchargement'
        });
      }
    });
  } else {
    // Si ce n'est pas un upload de fichier, c'est probablement un upload de vidéo
    // Nous utilisons multer().none() pour parser le formulaire sans fichier
    multer().none()(req, res, (parseErr) => {
      if (parseErr) {
        console.error('Erreur de parsing du formulaire vidéo:', parseErr);
        return res.status(400).json({
          error: parseErr.message || 'Erreur lors du traitement du formulaire vidéo'
        });
      }
      
      console.log('Données de formulaire vidéo reçues:', req.body);
      
      // Vérifie si c'est bien un upload de vidéo
      if (req.body.uploadType === 'video') {
        // Traitement pour les liens vidéo
        handleVideoUpload(req, res);
      } else {
        // Si ce n'est ni un fichier ni une vidéo, c'est une erreur
        res.status(400).json({
          error: 'Type d\'upload non reconnu'
        });
      }
    });
  }
});

/**
 * Fonction pour gérer l'upload de liens vidéo
 * Traite les liens vidéo comme des "fichiers virtuels" et les stocke dans fichiers.json
 * 
 * @param {Object} req - Requête HTTP contenant les données du formulaire
 * @param {Object} res - Réponse HTTP
 */
async function handleVideoUpload(req, res) {
  try {
    console.log('Traitement d\'un lien vidéo:', req.body);
    
    // Validation des données reçues
    const { nomDiscord, cours, titre, description, videoUrl } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'Aucun lien vidéo n\'a été fourni' });
    }
    
    if (!nomDiscord || !cours || !titre) {
      return res.status(400).json({ error: 'Informations manquantes (nom, cours ou titre)' });
    }
    
    // Création d'un identifiant unique pour la vidéo
    const videoId = Date.now().toString();
    const dateAjout = new Date().toLocaleDateString('fr-FR');
    
    // Création de l'objet à stocker dans fichiers.json
    const videoEntry = {
      id: nextId,
      type: 'video',
      url: videoUrl,
      nomDiscord,
      cours,
      titre,
      description: description || '',
      dateAjout,
      poidsFichier: 0, // Pas de poids pour les vidéos en ligne
      nomFichier: `video-${videoId}` // Nom de fichier virtuel
    };
    
    // Chargement et mise à jour du fichier JSON
    let fileList = [];
    const jsonPath = path.join(__dirname, 'fichiers.json');
    
    if (fs.existsSync(jsonPath)) {
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      try {
        fileList = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Erreur lors du parsing du fichier JSON:', parseError);
        fileList = [];
      }
    }
    
    // Ajout de la nouvelle entrée vidéo
    fileList.push(videoEntry);
    
    // Sauvegarde du fichier JSON mis à jour
    fs.writeFileSync(jsonPath, JSON.stringify(fileList, null, 2));
    console.log('Fichier JSON mis à jour avec le lien vidéo');
    
    // Envoi d'un email de notification
    try {
      await transporter.sendMail({
        from: `Thomas Bauwens <${emailSender}>`,
        to: emailSender,
        subject: `Nouvelle vidéo ajoutée: ${titre}`,
        text: `Une nouvelle vidéo a été ajoutée:

Cours: ${cours}
Titre: ${titre}
Auteur: ${nomDiscord}
Lien: ${videoUrl}
Description: ${description || 'Aucune description'}`
      });
      console.log('Email de notification envoyé pour la vidéo');
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
      // On continue malgré l'erreur d'email car la vidéo a bien été enregistrée
    }
    
    // Réponse de succès
    res.json({
      success: true,
      message: `Vidéo ajoutée par ${nomDiscord} : ${titre}`
    });
    
  } catch (error) {
    console.error('Erreur lors du traitement du lien vidéo:', error);
    res.status(500).json({
      error: 'Une erreur est survenue lors de l\'enregistrement du lien vidéo'
    });
  }
}

/**
 * Route pour récupérer la liste des fichiers
 * Renvoie les métadonnées de tous les fichiers stockés dans fichiers.json
 * 
 * @route GET /get-files
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
app.get('/get-files', (req, res) => {
  try {
    // Utiliser un chemin absolu pour fichiers.json
    const jsonPath = path.join(__dirname, 'fichiers.json');
    console.log('Chemin du fichier JSON:', jsonPath);

    // Si le fichier n'existe pas encore, renvoyer un tableau vide
    if (!fs.existsSync(jsonPath)) {
      console.log('Fichier JSON introuvable, renvoi d\'un tableau vide');
      return res.json([]);
    }

    // Lire et parser le fichier JSON
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    console.log('Contenu du fichier JSON lu avec succès');
    
    const files = JSON.parse(fileContent);
    console.log(`${files.length} fichiers trouvés`);

    res.json(files);
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers' });
  }
});
app.post('/edit-file', (req, res) => {
  const fileId = parseInt(req.body.id);
  if (!fileId) {
    return res.status(400).json({ error: 'ID de fichier manquant' });
  }
  try {
    // Utiliser un chemin absolu pour fichiers.json
    const jsonPath = path.join(__dirname, 'fichiers.json');
    // Si le fichier n'existe pas encore, renvoyer un tableau vide
    if (!fs.existsSync(jsonPath)) {
      console.log('Fichier JSON introuvable');
      return res.json([]);
    }
    
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    let fichiers = JSON.parse(fileContent);
    console.log(`Nombre de fichiers trouvés: ${fichiers.length}`);
    
    // Recherche du fichier à modifier
    const fileIndex = fichiers.findIndex(file => file.id === fileId);
    if (fileIndex === -1) {
      console.log('Fichier introuvable');
      return res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }
    
    // Mise à jour du fichier
    const updatedFile = { ...fichiers[fileIndex], ...req.body };
    fichiers[fileIndex] = updatedFile;
    
    // Sauvegarde du fichier JSON mis à jour
    fs.writeFileSync(jsonPath, JSON.stringify(fichiers, null, 2));
    console.log('Fichier JSON mis à jour avec succès');
    
    res.json({ success: true, message: 'Fichier mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du fichier:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du fichier: ' + error.message });
  }
});

// Route pour supprimer un fichier
app.post('/delete-file', (req, res) => {
  const fileId = parseInt(req.body.id);
  if (!fileId) {
    return res.status(400).json({ error: 'ID de fichier manquant' });
  }

  try {
    console.log('Début de la suppression du fichier avec ID:', fileId);

    // Utiliser un chemin absolu pour fichiers.json
    const jsonPath = path.join(__dirname, 'fichiers.json');
    
    // Vérifier si le fichier JSON existe
    if (!fs.existsSync(jsonPath)) {
      console.log('Fichier JSON introuvable');
      return res.status(404).json({ success: false, message: 'Fichier JSON introuvable' });
    }

    // Lire le fichier JSON
    const fichiers = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Trouver l'index du fichier à supprimer
    const fileIndex = fichiers.findIndex(file => file.id === fileId);
    if (fileIndex === -1) {
      console.log('Fichier avec ID', fileId, 'non trouvé');
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }

    // Récupérer le fichier à supprimer
    const fichierASupprimer = fichiers[fileIndex];
    console.log('Fichier à supprimer:', fichierASupprimer);
    
    // Si c'est un fichier physique (PDF ou ZIP), le supprimer du système de fichiers
    if (fichierASupprimer.path && (fichierASupprimer.type === 'pdf' || fichierASupprimer.type === 'zip')) {
      const filePath = path.join(__dirname, fichierASupprimer.path);
      console.log('Suppression du fichier physique:', filePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Fichier physique supprimé avec succès');
      } else {
        console.log('Fichier physique introuvable, poursuite de la suppression des métadonnées');
      }
    }
    
    // Supprimer l'entrée du fichier JSON
    fichiers.splice(fileIndex, 1);
    console.log('Entrée supprimée du fichier JSON');
    
    // Enregistrer le fichier JSON mis à jour
    fs.writeFileSync(jsonPath, JSON.stringify(fichiers, null, 2));
    // Enregistrer les modifications
    fs.writeFileSync(fichiersJsonPath, JSON.stringify(fichiers, null, 2), 'utf8');
    console.log('Fichier JSON mis à jour avec succès');
    
    res.json({ success: true, message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du fichier: ' + error.message });
  }
});

/**
 * Route pour le formulaire de contact
 * Gère l'envoi d'emails à partir du formulaire de contact
 * 
 * @route POST /ask-question
 * @param {Object} req - Requête HTTP contenant les données du formulaire
{{ ... }}
 */
// Route pour supprimer un fichier
app.delete('/delete-file/:id', async (req, res) => {
  try {
    // Convertir l'ID en nombre si c'est un nombre
    const fileId = parseInt(req.params.id, 10);
    const fileIdStr = req.params.id;
    
    // Lire le fichier JSON actuel
    const jsonData = JSON.parse(fs.readFileSync('fichiers.json', 'utf8'));
    
    // Trouver le fichier à supprimer (vérifier à la fois comme nombre et comme chaîne)
    let fileToDelete = jsonData.find(file => file.id === fileId || file.id === fileIdStr);
    
    if (!fileToDelete) {
      console.error(`Fichier non trouvé avec l'ID: ${fileIdStr} (ou ${fileId})`);
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    
    console.log(`Fichier à supprimer trouvé:`, fileToDelete);
    
    // Supprimer le fichier physique
    let filePath;
    if (fileToDelete.path.startsWith('/')) {
      // Si le chemin commence par /, on le considère comme relatif à la racine du projet
      filePath = path.join(__dirname, fileToDelete.path);
    } else {
      // Sinon, on utilise le chemin tel quel
      filePath = path.join(__dirname, fileToDelete.path);
    }
    
    console.log(`Tentative de suppression du fichier physique: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Fichier physique supprimé avec succès: ${filePath}`);
    } else {
      console.warn(`Le fichier physique n'existe pas: ${filePath}`);
    }
    
    // Mettre à jour fichiers.json
    const updatedFiles = jsonData.filter(file => {
      // Filtrer à la fois par nombre et par chaîne
      return file.id !== fileId && file.id !== fileIdStr;
    });
    
    fs.writeFileSync('fichiers.json', JSON.stringify(updatedFiles, null, 2));
    console.log(`Entrée supprimée de fichiers.json, ${jsonData.length - updatedFiles.length} entrée(s) supprimée(s)`);
    
    res.json({ success: true, message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du fichier' });
  }
});

app.post('/ask-question', async (req, res) => {
  try {
    // Extraction des données du formulaire
    // Debug: Afficher tout le contenu de req.body pour voir ce qui est reçu
    console.log('Contenu complet de req.body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Récupération des données du formulaire
    let nomDiscord = 'Non fourni';
    let email = 'Non fourni';
    let message = 'Non fourni';
    
    // Vérification si les données sont présentes dans req.body (JSON)
    if (req.body) {
      console.log('Type de req.body:', typeof req.body);
      
      // Si req.body est une chaîne de caractères (peut arriver avec certaines configurations)
      if (typeof req.body === 'string') {
        try {
          const parsedBody = JSON.parse(req.body);
          console.log('Corps parsé:', parsedBody);
          
          if (parsedBody.nomDiscord) nomDiscord = parsedBody.nomDiscord;
          if (parsedBody.email) email = parsedBody.email;
          if (parsedBody.message) message = parsedBody.message;
        } catch (parseError) {
          console.error('Erreur de parsing JSON:', parseError);
        }
      } else {
        // Traitement normal de l'objet req.body
        if (req.body.nomDiscord) nomDiscord = req.body.nomDiscord;
        else if (req.body.discord) nomDiscord = req.body.discord;
        else if (req.body.nomDiscordQuestion) nomDiscord = req.body.nomDiscordQuestion;
        
        if (req.body.email) email = req.body.email;
        if (req.body.message) message = req.body.message;
      }
    }
    
    console.log('Données extraites du formulaire:', { nomDiscord, email, message });

    // Utilisation de la variable globale emailSender définie plus haut
    console.log('Route /ask-question: Utilisation de l\'adresse email:', emailSender);
    
    // Envoi de l'email de contact avec les données récupérées
    await transporter.sendMail({
      from: `Thomas Bauwens <${emailSender}>`,
      to: emailSender,
      subject: 'Nouveau message de contact',
      text: `Message de contact :\n\nNom Discord : ${nomDiscord}\nEmail : ${email}\nMessage :\n${message}`
    });

    // Réponse de succès
    res.json({ success: true, message: 'Message envoyé avec succès' });

  } catch (error) {
    // Gestion des erreurs
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

/**
 * Route d'authentification pour l'accès à l'administration
 * Vérifie le mot de passe et renvoie un token si valide
 */
app.post('/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    
    // Utiliser le mot de passe d'administration depuis config.js
    // Si non défini, utiliser une valeur par défaut (uniquement pour le développement)
    const ADMIN_PASSWORD = (config.admin && config.admin.password) || "admin_dev_password";
    
    // Vérifier le mot de passe
    if (password === ADMIN_PASSWORD) {
      // Générer un token simple (pour une application de production, utilisez JWT)
      const token = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'authentification' });
  }
});
