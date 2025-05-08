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
const port = config.server.port;        // Port sur lequel le serveur va écouter

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
    // Création du flux de sortie pour le fichier ZIP
    const output = fs.createWriteStream(outputPath);
    // Création de l'archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Niveau de compression maximum
    });
    
    // Gestion des événements
    output.on('close', () => {
      console.log(`Archive créée: ${archive.pointer()} octets`);
      resolve(outputPath);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    // Connexion de l'archive au flux de sortie
    archive.pipe(output);
    
    // Ajout des fichiers à l'archive
    files.forEach(file => {
      archive.file(file.path, { name: file.originalname });
    });
    
    // Finalisation de l'archive
    archive.finalize();
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
    
    // Création des métadonnées du fichier
    const fileMetadata = {
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

app.post('/upload', (req, res) => {
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
    // Si le fichier n'existe pas encore, renvoyer un tableau vide
    if (!fs.existsSync(jsonPath)) {
      console.log('Fichier JSON introuvable');
      return res.json([]);
    }
    
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    let fichiers = JSON.parse(fileContent);
    console.log(`Nombre de fichiers trouvés: ${fichiers.length}`);
    
    // Ajouter des informations de taille et de date pour chaque fichier
    fichiers = fichiers.map(fichier => {
      // Garantir que tous les fichiers ont un type
      if (!fichier.type) {
        if (fichier.url) {
          fichier.type = 'video';
        } else if (fichier.path && fichier.path.endsWith('.zip')) {
          fichier.type = 'zip';
        } else {
          fichier.type = 'pdf';
        }
        console.log(`Type manquant détecté, assigné: ${fichier.type} pour le fichier: ${fichier.titre || 'sans titre'}`);
      }
      
      // Si c'est une vidéo, on ne peut pas obtenir la taille du fichier
      if (fichier.type === 'video') {
        const result = { 
          ...fichier, 
          taille: fichier.taille || 0, 
          date: fichier.date || new Date().toISOString() 
        };
        console.log(`Vidéo: ${fichier.titre}, taille: ${result.taille}, date: ${result.date}`);
        return result;
      }
      
      // Pour les fichiers physiques, récupérer la taille et la date de modification
      if (fichier.path) {
        try {
          const filePath = path.join(__dirname, fichier.path);
          console.log(`Vérification du fichier: ${filePath}`);
          
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const result = {
              ...fichier,
              taille: stats.size,
              date: fichier.date || stats.mtime.toISOString()
            };
            console.log(`Fichier ${fichier.titre}: taille = ${result.taille} octets, date = ${result.date}`);
            return result;
          } else {
            console.log(`Fichier non trouvé: ${filePath}`);
            return { ...fichier, taille: 0, date: fichier.date || new Date().toISOString() };
          }
        } catch (err) {
          console.log(`Impossible de lire les stats pour ${fichier.path}:`, err.message);
          return { ...fichier, taille: 0, date: fichier.date || new Date().toISOString() };
        }
      }
      
      // Cas par défaut: assurer que tous les fichiers ont une taille et une date
      const result = { 
        ...fichier, 
        taille: fichier.taille || 0, 
        date: fichier.date || new Date().toISOString() 
      };
      console.log(`Fichier sans chemin: ${fichier.titre}, taille: ${result.taille}, date: ${result.date}`);
      return result;
    });
    
    console.log(`Envoi de ${fichiers.length} fichiers avec taille et date`);
    
    // Trier les fichiers par date en ordre décroissant (du plus récent au plus ancien)
    fichiers.sort((a, b) => {
      // Convertir les dates en objets Date pour la comparaison
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      // Ordre décroissant (du plus récent au plus ancien)
      return dateB - dateA;
    });
    
    res.json(fichiers);
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des fichiers' });
  }
});

/**
 * Routes d'administration pour gérer les fichiers
 * Ces routes permettent de modifier et supprimer des fichiers
 */

// Chemin vers le fichier JSON contenant les métadonnées des fichiers
const fichiersJsonPath = path.join(__dirname, 'fichiers.json');

// Route pour mettre à jour les informations d'un fichier
app.post('/admin/update-file', (req, res) => {
  try {
    console.log('Début de la mise à jour du fichier');
    const { index, updates } = req.body;
    
    // Vérifier que les données nécessaires sont présentes
    if (index === undefined || !updates) {
      console.log('Données invalides:', { index, updates });
      return res.status(400).json({ success: false, message: 'Données invalides' });
    }
    
    // Lire le fichier JSON
    const fichiers = JSON.parse(fs.readFileSync(fichiersJsonPath, 'utf8'));
    
    // Vérifier que l'index est valide
    if (index < 0 || index >= fichiers.length) {
      console.log('Index invalide:', index);
      return res.status(400).json({ success: false, message: 'Index invalide' });
    }
    
    const fichierOriginal = fichiers[index];
    console.log('Fichier original:', fichierOriginal);
    console.log('Mises à jour:', updates);
    
    // Vérifier si le type de fichier change
    const typeChange = updates.type && updates.type !== fichierOriginal.type;
    
    // Vérifier si le cours change
    const coursChange = updates.cours && updates.cours !== fichierOriginal.cours;
    
    // Si le type change de PDF/ZIP à vidéo, supprimer le fichier physique
    // car les vidéos sont juste des liens
    if (typeChange && updates.type === 'video' && fichierOriginal.path) {
      console.log('Conversion en vidéo - Suppression du fichier physique');
      
      try {
        // Chemin complet du fichier à supprimer
        const fileToDelete = path.join(__dirname, fichierOriginal.path);
        console.log('Fichier à supprimer:', fileToDelete);
        
        // Vérifier si le fichier existe
        if (fs.existsSync(fileToDelete)) {
          // Supprimer le fichier
          fs.unlinkSync(fileToDelete);
          console.log('Fichier supprimé avec succès');
        } else {
          console.log('Le fichier n\'existe pas, aucune suppression nécessaire');
        }
        
        // Pour les vidéos, nous n'avons pas besoin de path car c'est juste un lien
        updates.path = null;
      } catch (deleteError) {
        console.error('Erreur lors de la suppression du fichier:', deleteError);
        // On continue malgré l'erreur de suppression, car la conversion peut quand même fonctionner
        updates.path = null;
      }
    }
    // Si le cours change et que c'est un fichier physique (pas une vidéo), déplacer le fichier
    else if (coursChange && fichierOriginal.path && (fichierOriginal.type === 'pdf' || fichierOriginal.type === 'zip')) {
      try {
        console.log('Déplacement du fichier suite au changement de cours');
        
        // Obtenir le chemin du fichier original
        const oldPath = path.join(__dirname, fichierOriginal.path);
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(oldPath)) {
          console.error('Fichier introuvable:', oldPath);
          return res.status(404).json({ success: false, message: 'Fichier introuvable' });
        }
        
        // Créer le nouveau chemin en remplaçant l'ancien cours par le nouveau
        const newPath = fichierOriginal.path.replace(
          /Les synthèses des invités\/[^\/]+\//,
          `Les synthèses des invités/${updates.cours}/`
        );
        
        // Créer le répertoire de destination s'il n'existe pas
        const newDir = path.join(__dirname, 'Les synthèses des invités', updates.cours);
        if (!fs.existsSync(newDir)) {
          console.log('Création du répertoire:', newDir);
          fs.mkdirSync(newDir, { recursive: true });
        }
        
        // Chemin complet du nouveau fichier
        const newFullPath = path.join(__dirname, newPath);
        
        console.log('Déplacement de', oldPath, 'vers', newFullPath);
        
        // Déplacer le fichier
        fs.renameSync(oldPath, newFullPath);
        
        // Mettre à jour le chemin dans les mises à jour
        updates.path = newPath;
        console.log('Nouveau chemin:', updates.path);
      } catch (moveError) {
        console.error('Erreur lors du déplacement du fichier:', moveError);
        return res.status(500).json({ 
          success: false, 
          message: 'Erreur lors du déplacement du fichier: ' + moveError.message 
        });
      }
    }
    
    // Mettre à jour le fichier
    fichiers[index] = { ...fichierOriginal, ...updates };
    console.log('Fichier mis à jour:', fichiers[index]);
    
    // Enregistrer les modifications
    fs.writeFileSync(fichiersJsonPath, JSON.stringify(fichiers, null, 2), 'utf8');
    console.log('Fichier JSON mis à jour avec succès');
    
    res.json({ success: true, message: 'Fichier mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du fichier:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du fichier: ' + error.message });
  }
});

// Route pour supprimer un fichier
app.post('/admin/delete-file', (req, res) => {
  try {
    console.log('Début de la suppression du fichier');
    const { index } = req.body;
    console.log('Index à supprimer:', index);
    
    // Vérifier que l'index est présent
    if (index === undefined) {
      console.log('Erreur: Index non spécifié');
      return res.status(400).json({ success: false, message: 'Index non spécifié' });
    }
    
    // Lire le fichier JSON
    console.log('Lecture du fichier JSON:', fichiersJsonPath);
    const fichiers = JSON.parse(fs.readFileSync(fichiersJsonPath, 'utf8'));
    console.log('Nombre de fichiers dans la base de données:', fichiers.length);
    
    // Vérifier que l'index est valide
    if (index < 0 || index >= fichiers.length) {
      console.log('Erreur: Index invalide:', index);
      return res.status(400).json({ success: false, message: 'Index invalide' });
    }
    
    // Récupérer le fichier à supprimer
    const fichier = fichiers[index];
    console.log('Fichier à supprimer:', fichier);
    
    // Si c'est un fichier physique (PDF ou ZIP), supprimer le fichier du système de fichiers
    if (fichier.type !== 'video' && fichier.path) {
      try {
        const filePath = path.join(__dirname, fichier.path);
        console.log('Chemin du fichier physique à supprimer:', filePath);
        
        if (fs.existsSync(filePath)) {
          console.log('Le fichier existe, suppression en cours...');
          fs.unlinkSync(filePath);
          console.log('Fichier physique supprimé avec succès');
        } else {
          console.log('Le fichier physique n\'existe pas, aucune suppression nécessaire');
        }
      } catch (deleteError) {
        console.error('Erreur lors de la suppression du fichier physique:', deleteError);
        // On continue malgré l'erreur de suppression du fichier physique
      }
    } else {
      console.log('Pas de fichier physique à supprimer (vidéo ou chemin manquant)');
    }
    
    // Supprimer l'entrée du tableau
    fichiers.splice(index, 1);
    console.log('Entrée supprimée du tableau, nouveau nombre de fichiers:', fichiers.length);
    
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

/**
 * Démarrage du serveur sur le port spécifié
 */
const startServer = () => {
  const server = app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
  });
  return server;
};

// Exporter l'application et la fonction de démarrage du serveur
module.exports = {
  app: app,
  startServer: startServer
};
