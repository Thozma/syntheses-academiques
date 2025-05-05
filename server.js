/**
 * Serveur Node.js pour la gestion d'un site de partage de synthèses académiques
 * Ce serveur gère les uploads de fichiers PDF, l'envoi d'emails et sert les fichiers statiques
 * 
 * @author Thomas Bauwens
 * @version 1.0.0
 * @date Mai 2025
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
    
    // Génération du nom de fichier complet
    cb(null, `${secureCours} - ${secureTitre} - ${secureNomDiscord} - ${fileSize.toFixed(2)}MB - ${date}${path.extname(file.originalname)}`);
  }
});

/**
 * Configuration complète de Multer avec filtrage des types de fichiers et limites
 */
const upload = multer({
  storage: storage, // Utilise la configuration de stockage définie ci-dessus
  
  /**
   * Filtre les fichiers pour n'accepter que les PDF
   * 
   * @param {Object} req - L'objet requête HTTP
   * @param {Object} file - L'objet fichier uploadé
   * @param {Function} cb - Fonction de callback
   */
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Seuls les fichiers PDF sont autorisés'));
    }
    cb(null, true); // Accepte le fichier
  },
  
  // Limite la taille des fichiers à 15 MB
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB
  }
});

// ========== CONFIGURATION DE NODEMAILER POUR L'ENVOI D'EMAILS ==========
/**
 * Configuration du transporteur d'emails avec Nodemailer
 * Utilise les paramètres du fichier de configuration pour sécuriser les données sensibles
 */
const transporter = nodemailer.createTransport(config.smtp);

// Variable pour stocker l'adresse email de l'expéditeur pour une utilisation dans les routes
// Utilisation directe de config.smtp.auth.user pour éviter les problèmes de portée
const emailSender = config.smtp.auth.user;
console.log('Configuration email: Utilisation de l\'adresse', emailSender);

// ========== ROUTES DU SERVEUR ==========

/**
 * Route pour l'upload de fichiers PDF
 * Gère le téléversement des fichiers, la création des métadonnées et l'envoi d'emails de notification
 * 
 * @route POST /upload
 * @param {Object} req - Requête HTTP contenant le fichier et les données du formulaire
 * @param {Object} res - Réponse HTTP
 */
app.post('/upload', (req, res) => {
  // Utilisation de multer pour traiter le fichier uploadé
  upload.single('fichier')(req, res, async (err) => {
    // Gestion des erreurs d'upload (taille, format, etc.)
    if (err) {
      console.error('Erreur upload:', err);
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

      /**
       * Création des métadonnées du fichier
       * Ces données seront stockées dans le fichier JSON et utilisées pour l'affichage
       */
      const fileData = {
        titre: req.body.titre,                  // Titre de la synthèse
        nomDiscord: req.body.nomDiscord,       // Nom Discord de l'auteur
        description: req.body.description || '', // Description (optionnelle)
        poidsFichier: file.size,               // Taille du fichier en octets
        // Date formatée en français avec jour, mois, année, heure et minute
        dateAjout: new Date().toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        cours: req.body.cours,                  // Catégorie/cours associé
        nomFichier: file.filename              // Nom du fichier sur le serveur
      };

      /**
       * Mise à jour du fichier JSON contenant les métadonnées de tous les fichiers
       * Ce fichier est utilisé pour générer la liste des synthèses sur la page d'accueil
       */
      let fileList = [];
      // Utiliser un chemin absolu pour fichiers.json
      const jsonPath = path.join(__dirname, 'fichiers.json');
      console.log('Chemin du fichier JSON pour l\'upload:', jsonPath);
      
      // Charger la liste existante si le fichier existe déjà
      if (fs.existsSync(jsonPath)) {
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        console.log('Fichier JSON existant trouvé, taille:', fileContent.length);
        fileList = JSON.parse(fileContent);
        console.log('Nombre de fichiers existants:', fileList.length);
      } else {
        console.log('Création d\'un nouveau fichier JSON');
      }
      
      // Ajouter le nouveau fichier et trier par date (plus récent en premier)
      fileList.push(fileData);
      fileList.sort((a, b) => new Date(b.dateAjout) - new Date(a.dateAjout));
      console.log('Nombre total de fichiers après ajout:', fileList.length);
      
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
          subject: 'Nouveau fichier téléchargé',
          text: `Un nouveau fichier a été téléchargé :\n\n` +
                `Nom Discord : ${req.body.nomDiscord}\n` +
                `Nom du fichier : ${file.filename}\n` +
                `Poids : ${(file.size / 1048576).toFixed(2)} MB\n` +
                `Date d'envoi : ${new Date().toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}`
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
});

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
      console.log('Fichier JSON introuvable');
      return res.json([]);
    }
    
    // Lire et parser le fichier JSON
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    console.log('Contenu du fichier JSON (premiers 100 caractères):', fileContent.substring(0, 100));
    
    const fileList = JSON.parse(fileContent);
    console.log('Nombre de fichiers trouvés:', fileList.length);
    
    // Renvoyer la liste au format JSON
    res.json(fileList);
  } catch (error) {
    // Gestion des erreurs
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers' });
  }
});

/**
 * Route pour le formulaire de contact
 * Gère l'envoi d'emails à partir du formulaire de contact
 * 
 * @route POST /ask-question
 * @param {Object} req - Requête HTTP contenant les données du formulaire
 * @param {Object} res - Réponse HTTP
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
 * Démarrage du serveur sur le port spécifié
 */
const server = app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

// Exporter le serveur pour permettre une gestion propre de l'arrêt
module.exports = server;
