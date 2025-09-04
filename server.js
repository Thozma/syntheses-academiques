/**
  Site web de partage de synthèses académiques - SERVER.JS
  Gestion des uploads, vidéos, messages et fichiers JSON associés
  @author: Thomas Bauwens
  @date : mai 2025
  @modifiéDate : septembre 2025
*/

// ========== IMPORTS DES MODULES ==========
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const config = require('./config');
const cookieParser = require('cookie-parser');
const cookieRoutes = require('./cookiesRoutes');

// ========== CONFIGURATION DE BASE ==========
const app = express();
app.use(express.static(__dirname));
app.use('/Les synthèses des invités', express.static(path.join(__dirname, 'Les synthèses des invités')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/', cookieRoutes);

// Route racine
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour la page d'administration
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Créer le dossier principal si nécessaire
const mainDir = 'Les synthèses des invités';
if (!fs.existsSync(mainDir)) {
  fs.mkdirSync(mainDir, { recursive: true });
}

// ========== CONFIGURATION DE MULTER POUR L'UPLOAD DE FICHIERS ==========
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const cours = req.body.cours || 'Divers';
    const dir = path.join(__dirname, 'Les synthèses des invités', cours);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const cours = req.body.cours || 'Divers';
    const titre = req.body.titre || 'Sans titre';
    const nomDiscord = req.body.nomDiscord || 'Anonyme';
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const secureTitre = titre.replace(/[\/:\*?"<>|]/g, '_');
    const secureNomDiscord = nomDiscord.replace(/[\/:\*?"<>|]/g, '_');
    const secureCours = cours.replace(/[\/:\*?"<>|]/g, '_');
    const uploadType = req.body.uploadType || 'pdf';
    let extension = '.pdf';
    if (uploadType === 'zip') {
      extension = '.zip';
    } else if (file.originalname) {
      const originalExtension = path.extname(file.originalname).toLowerCase();
      if (originalExtension === '.pdf' || originalExtension === '.zip') {
        extension = originalExtension;
      }
    }
    const fileName = `${secureCours}_${secureTitre}_${secureNomDiscord}_${date}${extension}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF et ZIP sont acceptés'), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Multer pour uploads multiples
const uploadMulti = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 20 }
});

// ========== CONFIGURATION DE NODEMAILER ==========
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.auth.user,
    pass: config.smtp.auth.pass
  }
});

const emailSender = config.smtp.auth.user;

// ========== FONCTIONS UTILITAIRES ==========
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

function createZipFromFiles(files, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(files) || files.length === 0) {
        throw new Error('Aucun fichier valide à inclure dans l\'archive');
      }
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
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
          reject(err);
        }
      });
      archive.pipe(output);
      let validFilesCount = 0;
      files.forEach((file, index) => {
        if (file && file.path && fs.existsSync(file.path)) {
          try {
            const fileName = file.originalname || path.basename(file.path);
            console.log(`[${index + 1}/${files.length}] Ajout du fichier ${fileName} à l'archive`);
            archive.file(file.path, { name: fileName });
            validFilesCount++;
          } catch (fileError) {
            console.error(`Erreur lors de l'ajout du fichier ${file.path}:`, fileError);
          }
        } else {
          console.warn(`Fichier ignoré: ${file ? file.path : 'undefined'}`);
        }
      });
      if (validFilesCount === 0) {
        throw new Error('Aucun fichier valide n\'a pu être ajouté à l\'archive');
      }
      console.log(`Finalisation de l'archive avec ${validFilesCount} fichiers valides`);
      archive.finalize();
    } catch (error) {
      console.error('Erreur lors de la création du ZIP:', error);
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          console.log(`Fichier ZIP incomplet supprimé: ${outputPath}`);
        } catch (unlinkError) {
          console.error(`Erreur lors de la suppression du fichier ZIP:`, unlinkError);
        }
      }
      reject(error);
    }
  });
}

// ========== ROUTES ==========

// Route pour l'authentification
app.post('/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    const ADMIN_PASSWORD = (config.admin && config.admin.password) || "admin_dev_password";
    if (password === ADMIN_PASSWORD) {
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

// Route pour ajouter un message
app.post('/add-message', async (req, res) => {
  try {
    const { nom, message } = req.body;
    if (!nom || !message) {
      return res.status(400).json({ success: false, message: 'Nom et message sont requis' });
    }
    const chatPath = path.join(__dirname, 'chat.json');
    let chatData = [];
    if (fs.existsSync(chatPath)) {
      try {
        chatData = JSON.parse(fs.readFileSync(chatPath, 'utf8'));
      } catch (error) {
        console.error('Erreur lors de la lecture de chat.json:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de la lecture du fichier de messages' });
      }
    }
    const newEntry = {
      date: new Date().toLocaleString('fr-FR'),
      nom,
      message
    };
    chatData.push(newEntry);
    try {
      fs.writeFileSync(chatPath, JSON.stringify(chatData, null, 2));
    } catch (error) {
      console.error('Erreur lors de l\'écriture dans chat.json:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du message' });
    }
    res.json({ success: true, message: 'Message ajouté avec succès' });
  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ success: false, message: `Erreur serveur : ${error.message}` });
  }
});

// Route pour récupérer les messages
app.get('/get-messages', async (req, res) => {
  try {
    const chatPath = path.join(__dirname, 'chat.json');
    let chatData = [];
    if (fs.existsSync(chatPath)) {
      try {
        chatData = JSON.parse(fs.readFileSync(chatPath, 'utf8'));
      } catch (error) {
        console.error('Erreur lors de la lecture de chat.json:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de la lecture des messages' });
      }
    }
    res.json(chatData);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour récupérer les logs
app.get('/get-logs', async (req, res) => {
  try {
    const logsPath = path.join(__dirname, 'logs.json');
    let logsData = [];
    if (fs.existsSync(logsPath)) {
      try {
        logsData = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
      } catch (error) {
        console.error('Erreur lors de la lecture de logs.json:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de la lecture des logs' });
      }
    }
    res.json(logsData);
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour uploader un fichier
app.post('/upload', async (req, res) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    handleVideoUpload(req, res);
  } else if (contentType.includes('multipart/form-data')) {
    upload.single('fichier')(req, res, async (err) => {
      if (err) {
        console.error('Erreur upload:', err);
        return res.status(400).json({ error: err.message || 'Erreur lors du téléchargement du fichier' });
      }
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'Aucun fichier n\'a été téléchargé' });
        }
        const fileExtension = path.extname(file.filename).toLowerCase();
        let fileType;
        if (fileExtension === '.pdf') {
          fileType = 'pdf';
        } else if (fileExtension === '.zip') {
          fileType = 'zip';
        } else {
          return res.status(400).json({ error: `Type de fichier non pris en charge: ${fileExtension}` });
        }
        const nextId = getNextAvailableId();
        const annee = req.body.annee ? parseInt(req.body.annee, 10) : null;
        const fileMetadata = {
          id: nextId,
          annee: annee,
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
        let fileList = [];
        const jsonPath = path.join(__dirname, 'fichiers.json');
        if (fs.existsSync(jsonPath)) {
          const fileContent = fs.readFileSync(jsonPath, 'utf8');
          try {
            fileList = JSON.parse(fileContent);
          } catch (parseError) {
            console.error('Erreur lors du parsing du fichier JSON:', parseError);
          }
        }
        fileList.push(fileMetadata);
        fs.writeFileSync(jsonPath, JSON.stringify(fileList, null, 2));
        try {
          await transporter.sendMail({
            from: `Thomas Bauwens <${emailSender}>`,
            to: emailSender,
            subject: `Nouvelle synthèse ajoutée: ${req.body.titre}`,
            text: `Une nouvelle synthèse a été ajoutée:\n\nCours: ${req.body.cours}\nTitre: ${req.body.titre}\nAuteur: ${req.body.nomDiscord}\nDescription: ${req.body.description || 'Aucune description'}\nTaille: ${(file.size / 1048576).toFixed(2)} MB`
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email:', emailError);
        }
        res.json({
          success: true,
          message: `Synthèse ajoutée par ${req.body.nomDiscord} : ${req.body.titre}`
        });
      } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors du téléchargement' });
      }
    });
  } else {
    multer().none()(req, res, (parseErr) => {
      if (parseErr) {
        console.error('Erreur de parsing:', parseErr);
        return res.status(400).json({ error: parseErr.message || 'Erreur lors du traitement du formulaire' });
      }
      if (req.body.uploadType === 'video') {
        handleVideoUpload(req, res);
      } else {
        res.status(400).json({ error: 'Type d\'upload non reconnu' });
      }
    });
  }
});

// Route pour uploader plusieurs fichiers
app.post('/upload-multi', uploadMulti.array('fichiers'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier n\'a été téléchargé' });
    }
    const cours = req.body.cours || 'Divers';
    const titre = req.body.titre || 'Sans titre';
    const nomDiscord = req.body.nomDiscord || 'Anonyme';
    const description = req.body.description || '';
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const secureTitre = titre.replace(/[\/:\*?"<>|]/g, '_');
    const secureNomDiscord = nomDiscord.replace(/[\/:\*?"<>|]/g, '_');
    const secureCours = cours.replace(/[\/:\*?"<>|]/g, '_');
    const destDir = path.join(__dirname, 'Les synthèses des invités', cours);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const zipFileName = `${secureCours}_${secureTitre}_${secureNomDiscord}_${date}.zip`;
    const zipFilePath = path.join(destDir, zipFileName);
    await createZipFromFiles(files, zipFilePath);
    const zipStats = fs.statSync(zipFilePath);
    const zipSize = zipStats.size;
    const nextId = getNextAvailableId();
    const annee = req.body.annee ? parseInt(req.body.annee, 10) : null;
    const fileMetadata = {
      id: nextId,
      annee: annee,
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
    fileList.push(fileMetadata);
    fs.writeFileSync(jsonPath, JSON.stringify(fileList, null, 2));
    files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error(`Erreur lors de la suppression du fichier temporaire ${file.path}:`, unlinkError);
      }
    });
    try {
      await transporter.sendMail({
        from: `Thomas Bauwens <${emailSender}>`,
        to: emailSender,
        subject: `Nouveau fichier assemblé ajouté: ${titre}`,
        text: `Un nouveau fichier assemblé a été ajouté:\n\nCours: ${cours}\nTitre: ${titre}\nAuteur: ${nomDiscord}\nNombre de fichiers: ${files.length}\nDescription: ${description || 'Aucune description'}`
      });
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
    }
    res.json({
      success: true,
      message: `Fichier assemblé créé par ${nomDiscord} : ${titre} (${files.length} fichiers)`
    });
  } catch (error) {
    console.error('Erreur lors du traitement des fichiers multiples:', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'assemblage des fichiers' });
  }
});

// Route pour gérer les liens vidéo
async function handleVideoUpload(req, res) {
  try {
    console.log('Traitement d\'un lien vidéo:', req.body);
    const { nomDiscord, cours, titre, description, videoUrl, annee } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ error: 'Aucun lien vidéo n\'a été fourni' });
    }
    if (!nomDiscord || !cours || !titre) {
      return res.status(400).json({ error: 'Informations manquantes (nom, cours ou titre)' });
    }
    const videoId = Date.now().toString();
    const dateAjout = new Date().toLocaleDateString('fr-FR');
    const nextId = getNextAvailableId();
    const videoEntry = {
      id: nextId,
      annee: annee ? parseInt(annee, 10) : null,
      type: 'video',
      url: videoUrl,
      nomDiscord,
      cours,
      titre,
      description: description || '',
      dateAjout,
      poidsFichier: 0,
      nomFichier: `video-${videoId}`
    };
    let fileList = [];
    const jsonPath = path.join(__dirname, 'fichiers.json');
    if (fs.existsSync(jsonPath)) {
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      try {
        fileList = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Erreur lors du parsing du fichier JSON:', parseError);
      }
    }
    fileList.push(videoEntry);
    fs.writeFileSync(jsonPath, JSON.stringify(fileList, null, 2));
    try {
      await transporter.sendMail({
        from: `Thomas Bauwens <${emailSender}>`,
        to: emailSender,
        subject: `Nouvelle vidéo ajoutée: ${titre}`,
        text: `Une nouvelle vidéo a été ajoutée:\n\nCours: ${cours}\nTitre: ${titre}\nAuteur: ${nomDiscord}\nLien: ${videoUrl}\nDescription: ${description || 'Aucune description'}`
      });
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
    }
    res.json({
      success: true,
      message: `Vidéo ajoutée par ${nomDiscord} : ${titre}`
    });
  } catch (error) {
    console.error('Erreur lors du traitement du lien vidéo:', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement du lien vidéo' });
  }
}

// Route pour récupérer les fichiers
app.get('/get-files', (req, res) => {
  try {
    const jsonPath = path.join(__dirname, 'fichiers.json');
    if (!fs.existsSync(jsonPath)) {
      return res.json([]);
    }
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const files = JSON.parse(fileContent);
    const annee = req.query.annee ? parseInt(req.query.annee, 10) : null;
    let filteredFiles = files;
    if (annee) {
      filteredFiles = files.filter(f => f.annee === annee);
    }
    res.json(filteredFiles);
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers' });
  }
});

// Route pour modifier un fichier
app.post('/edit-file', async (req, res) => {
  try {
    const { id, type, titre, cours, nomDiscord, description, url, annee } = req.body;
    const fichiersPath = path.join(__dirname, 'fichiers.json');
    const logsPath = path.join(__dirname, 'logs.json');
    const fichiers = JSON.parse(fs.readFileSync(fichiersPath, 'utf8'));
    const fileIndex = fichiers.findIndex(f => f.id === id);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    const file = fichiers[fileIndex];
    const oldValues = `[${file.id}] [${file.annee} - ${file.type} - ${file.titre} - ${file.cours} - ${file.nomDiscord}]`;
    if (((cours && cours !== file.cours) || (annee && parseInt(annee) !== file.annee)) && file.path) {
      const newDir = path.join(__dirname, 'Les synthèses des invités', `Annee_${annee}`, cours);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }
      const extension = file.type === 'video' ? '' : path.extname(file.nomFichier || '');
      const newFileName = `${cours}_${titre}_${nomDiscord}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}${extension}`;
      const newFilePath = path.join(newDir, newFileName);
      if (file.path && fs.existsSync(path.join(__dirname, file.path)) && file.type !== 'video') {
        fs.renameSync(path.join(__dirname, file.path), newFilePath);
        file.path = `/Les synthèses des invités/Annee_${annee}/${cours}/${newFileName}`;
        file.nomFichier = newFileName;
      }
    }
    Object.assign(file, {
      annee: annee ? parseInt(annee, 10) : file.annee,
      type: type || file.type,
      titre: titre || file.titre,
      cours: cours || file.cours,
      nomDiscord: nomDiscord || file.nomDiscord,
      description: description || file.description,
      url: url || file.url
    });
    fs.writeFileSync(fichiersPath, JSON.stringify(fichiers, null, 2));
    const newValues = `[${file.id}] [${file.annee} - ${file.type} - ${file.titre} - ${file.cours} - ${file.nomDiscord}]`;
    let logsData = [];
    if (fs.existsSync(logsPath)) {
      try {
        logsData = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
      } catch (error) {
        console.error('Erreur lors du parsing de logs.json:', error);
      }
    }
    logsData.push({
      date: new Date().toLocaleString('fr-FR'),
      action: `${oldValues} modifié -> ${newValues}`
    });
    fs.writeFileSync(logsPath, JSON.stringify(logsData, null, 2));
    res.json({ success: true, message: 'Fichier modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification:', error);
    res.status(500).json({ success: false, message: 'Erreur interne serveur' });
  }
});

// Route pour supprimer un fichier
app.delete('/delete-file/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id, 10);
    const jsonPath = path.join(__dirname, 'fichiers.json');
    const logsPath = path.join(__dirname, 'logs.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const fileToDelete = jsonData.find(file => file.id === fileId);
    if (!fileToDelete) {
      console.error(`Fichier non trouvé avec l'ID: ${fileId}`);
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    if (fileToDelete.path && (fileToDelete.type === 'pdf' || fileToDelete.type === 'zip')) {
      const filePath = path.join(__dirname, fileToDelete.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Fichier physique supprimé: ${filePath}`);
      }
    }
    const logEntry = `[${fileToDelete.id}] [${fileToDelete.annee} - ${fileToDelete.type} - ${fileToDelete.titre} - ${fileToDelete.cours} - ${fileToDelete.nomDiscord}] SUPPRIMÉ`;
    let logsData = [];
    if (fs.existsSync(logsPath)) {
      try {
        logsData = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
      } catch (error) {
        console.error('Erreur lors du parsing de logs.json:', error);
      }
    }
    logsData.push({
      date: new Date().toLocaleString('fr-FR'),
      action: logEntry
    });
    fs.writeFileSync(logsPath, JSON.stringify(logsData, null, 2));
    const updatedFiles = jsonData.filter(file => file.id !== fileId);
    fs.writeFileSync(jsonPath, JSON.stringify(updatedFiles, null, 2));
    res.json({ success: true, message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du fichier' });
  }
});

// Route pour le Hawkins
app.post('/ask-question', async (req, res) => {
  try {
    console.log('Contenu de req.body:', req.body);
    let nomDiscord = 'Non fourni';
    let email = 'Non fourni';
    let message = 'Non fourni';
    if (typeof req.body === 'string') {
      try {
        const parsedBody = JSON.parse(req.body);
        nomDiscord = parsedBody.nomDiscord || parsedBody.discord || parsedBody.nomDiscordQuestion || 'Non fourni';
        email = parsedBody.email || 'Non fourni';
        message = parsedBody.message || 'Non fourni';
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
      }
    } else {
      nomDiscord = req.body.nomDiscord || req.body.discord || req.body.nomDiscordQuestion || 'Non fourni';
      email = req.body.email || 'Non fourni';
      message = req.body.message || 'Non fourni';
    }
    await transporter.sendMail({
      from: `Thomas Bauwens <${emailSender}>`,
      to: emailSender,
      subject: 'Nouveau message de contact',
      text: `Message de contact :\n\nNom Discord : ${nomDiscord}\nEmail : ${email}\nMessage :\n${message}`
    });
    res.json({ success: true, message: 'Message envoyéWITH SUCCESS' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

module.exports = app;