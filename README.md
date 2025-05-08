# Plateforme de Partage de Synthèses Académiques

Une plateforme web intuitive permettant aux étudiants de première année en informatique de la Haute École Léonard de Vinci de partager et consulter des synthèses de cours. Cette application met l'accent sur une expérience utilisateur fluide avec une interface inspirée du langage Java.

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Dernière mise à jour](https://img.shields.io/badge/dernière%20mise%20à%20jour-8%20mai%202025-green.svg)
![Auteur](https://img.shields.io/badge/auteur-Thomas%20Bauwens-orange.svg)

## À Propos

Cette plateforme a été conçue pour faciliter le partage de ressources académiques entre étudiants. Elle propose une interface moderne et intuitive, avec un design inspiré du langage Java pour créer un environnement familier aux étudiants en informatique.

## Fonctionnalités

### Types de fichiers supportés
- Upload de fichiers PDF (jusqu'à 20 Mo)
- Upload de fichiers ZIP
- Upload multiple de fichiers avec création automatique d'archive ZIP
- Ajout de liens vidéo (YouTube, Vimeo, etc.)

### Interface utilisateur
- Sélection du type de contenu via boutons thématiques (pdf, zip, multi, video)
- Organisation par cours avec icônes thématiques
- Icônes distinctes pour les PDF (📄), les ZIP (💼) et les vidéos (🎬)
- Formulaire de contact intégré
- Interface responsive adaptée aux différents appareils
- Sections pliables/dépliables pour une meilleure organisation
- Style inspiré de Java avec mots-clés colorés
- Animations subtiles pour améliorer l'expérience utilisateur
- Liens qui conservent leur couleur d'origine après avoir été visités
- Bordure arc-en-ciel animée autour de la photo de profil
- Effet arc-en-ciel animé sur le titre principal

### Améliorations récentes (v1.2.0)
- Ajout de commentaires détaillés dans tous les fichiers CSS pour une meilleure maintenabilité
- Refonte complète de l'interface utilisateur avec un thème Java cohérent
- Optimisation des performances avec une meilleure gestion des ressources
- Amélioration de la documentation technique
- Mise à jour des dépendances vers les dernières versions stables
- Renforcement de la sécurité avec une meilleure validation des fichiers
- Amélioration de l'accessibilité et de l'expérience utilisateur
- Support complet des caractères spéciaux dans les noms de fichiers

### Fonctionnalités côté serveur
- Système de notification par email lors de nouveaux uploads avec template HTML personnalisé
- Validation robuste des fichiers avec vérification du type MIME et de la taille
- Gestion avancée des métadonnées des fichiers avec historique des modifications
- Création automatique d'archives ZIP pour les uploads multiples avec compression optimisée
- Système de nettoyage automatique des fichiers temporaires
- Logging détaillé des opérations pour le débogage
- Protection contre les attaques courantes (XSS, CSRF, injection)

## Installation locale

1. Clonez ce dépôt :
```bash
git clone <url-du-depot>
cd Siteweb
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez l'application :
```bash
# Copiez les fichiers de configuration d'exemple
cp config.example.js config.js
cp ftp-credentials.example.js ftp-credentials.js

# Modifiez les fichiers avec vos informations
# - config.js : paramètres SMTP pour l'envoi d'emails
# - ftp-credentials.js : identifiants pour le déploiement FTP
```

4. Lancez le serveur :
```bash
node app.js
```

5. Accédez à l'application dans votre navigateur :
```
http://localhost:3000
```

## Déploiement FTP (LWS)

1. Installez le module de déploiement :
```bash
npm install ftp-deploy --save-dev
```

2. Configurez les identifiants FTP :
```bash
# Copiez le fichier d'exemple et modifiez-le avec vos identifiants
cp ftp-credentials.example.js ftp-credentials.js

# Éditez le fichier ftp-credentials.js avec vos informations réelles
```

3. Ajustez le chemin distant dans deploy.js si nécessaire :
```javascript
remoteRoot: "/www/", // Modifiez selon votre configuration LWS
```

4. Lancez le déploiement :
```bash
node deploy.js
```

5. Vérifiez que votre hébergement supporte Node.js :
   - Si oui, configurez le démarrage de l'application via le panneau LWS
   - Si non, envisagez un hébergement spécialisé (Heroku, Vercel, Netlify)

## Structure du Projet

### Fichiers principaux
- `app.js` : Point d'entrée principal de l'application, gère le cycle de vie
- `server.js` : Serveur Node.js avec toutes les routes et la logique
- `index.html` : Interface utilisateur principale
- `style/style.css` : Styles CSS de l'application avec commentaires détaillés
- `package.json` : Définition des dépendances et scripts

## Prochaines étapes et améliorations futures

### Interface utilisateur
- Ajouter un mode sombre pour réduire la fatigue oculaire
- Implémenter un système de filtrage avancé pour les synthèses
- Créer une vue en grille alternative pour les synthèses
- Ajouter des animations de transition entre les pages

### Fonctionnalités
- Implémenter un système de notation des synthèses
- Ajouter un système de commentaires pour les synthèses
- Créer un système de recommandation basé sur les préférences de l'utilisateur
- Intégrer une prévisualisation des fichiers PDF directement dans l'interface

### Performance
- Optimiser le chargement des images et des ressources
- Implémenter le lazy loading pour les listes de synthèses
- Améliorer la compatibilité avec les navigateurs plus anciens

### Configuration et déploiement
- `config.js` : Configuration de l'application (SMTP, etc.)
- `config.example.js` : Exemple de configuration
- `ftp-credentials.js` : Identifiants pour le déploiement FTP
- `ftp-credentials.example.js` : Exemple de configuration FTP
- `deploy.js` : Script de déploiement FTP
- `.htaccess` : Fichier nécessaire pour la configuration de l'hébergement LWS

### Stockage des données
- `Les synthèses des invités/` : Dossier contenant les fichiers PDF et ZIP uploadés
- `temp/` : Dossier temporaire pour les fichiers lors de l'upload multiple
- `fichiers.json` : Base de données des fichiers uploadés (PDF, ZIP, vidéos)

## Sécurité

### Bonnes Pratiques
- Utilisation du fichier `.gitignore` pour exclure les fichiers sensibles
- Séparation des configurations sensibles dans des fichiers dédiés
- Validation des types MIME pour prévenir les uploads malveillants
- Limitation de la taille des fichiers (20 Mo max pour les PDF)

### Fichiers Sensibles
- `config.js` : Configuration SMTP et paramètres serveur
- `ftp-credentials.js` : Identifiants FTP pour le déploiement
- `fichiers.json` : Base de données des fichiers

### Protection des Données
- Nettoyage automatique des fichiers temporaires
- Vérification des extensions de fichiers
- Sanitization des noms de fichiers
- Protection contre les attaques XSS et CSRF

## Technologies Utilisées

- Node.js
- Express
- Multer (gestion des uploads)
- Nodemailer (envoi d'emails)
- Archiver (création d'archives ZIP)
- JavaScript vanilla (frontend)
- CSS3

## Éléments de Design

### Thème Java

Le site utilise un thème inspiré du langage de programmation Java pour créer une expérience familière aux étudiants en informatique :

#### Style des Mots-clés
- Couleur : Rouge (#d73a49) pour les mots-clés Java
- Police : Arial (non monospace) pour une meilleure lisibilité
- Taille : 0.9em pour une hiérarchie visuelle cohérente
- Poids : Normal (non gras) pour un style professionnel

#### Mots-clés Utilisés
- Contrôles : `for`, `while`, `if`, `else`
- Déclarations : `public`, `static`, `void`, `new`
- Actions : `import`, `submit`, `send`
- Types : `pdf`, `zip`, `video`, `multi`

#### Intégration Visuelle
- Boutons thématiques pour les types de fichiers
- Transitions et animations subtiles
- Effets de survol cohérents
- Palette de couleurs inspirée des IDE Java

### Icônes de Cours

Chaque cours est représenté par une icône Unicode thématique :

- Structure de Données : 📊 (graphique)
- Mathématique 1 : 🫀 (symbole mathématique)
- Mathématique 2 : 📝 (bloc-notes)
- Base de Données : 📂 (dossier)
- Systèmes d'Exploitation / Linux : 🐧 (pingouin pour Linux)
- JavaScript : 🐱 (chat pour JavaScript)
- Anglais : 🏴󠁧󠁢󠁥󠁮󠁧󠁿 (drapeau anglais)
- Algorithmique : 🧩 (pièce de puzzle)
- APOO : 🔍 (loupe)
- Fonctionnement des Ordinateurs : 💻 (ordinateur)
- Gestion, Comptabilité et Économie : 💰 (sac d'argent)
- Compétences Numériques : 📱 (smartphone)
- Divers : 📓 (bloc-notes)

### Interface Utilisateur

#### Formulaires
- Largeur optimale de 420px pour une meilleure lisibilité
- Espacement interne uniforme de 15px
- Alignement précis des champs et labels
- Expansion automatique du champ email (flex: 1)
- Placeholders descriptifs et intuitifs

#### Navigation
- Sections de cours pliables/dépliables
- Animation de flèche pour indiquer l'état
- Organisation hiérarchique claire
- Navigation fluide entre les sections

#### Animations et Effets
- Transitions douces pour les interactions
- Bordure arc-en-ciel animée sur la photo
- Effet de survol sur les boutons
- Feedback visuel immédiat

## Maintenance

### Code
- Commentaires détaillés dans tous les fichiers CSS
- Structure modulaire pour faciliter les modifications
- Nommage clair et cohérent des classes
- Documentation technique complète

### Performance
- Optimisation des images et ressources
- Minification des fichiers CSS et JS
- Nettoyage automatique des fichiers temporaires
- Gestion efficace de la mémoire

### Mises à jour
- Journal des modifications détaillé
- Versionnement sémantique
- Procédure de déploiement documentée
- Sauvegarde régulière des données

## Auteur

Thomas Bauwens

## Licence

Tous droits réservés © 2025

## Journal des modifications

### 07/05/2025
- Ajout de la fonctionnalité d'upload multiple avec création automatique d'archives ZIP
- Ajout de la prise en charge des fichiers ZIP
- Augmentation de la limite de taille des fichiers PDF à 20 Mo
- Modification des liens pour qu'ils conservent leur couleur d'origine après avoir été visités
- Ajout d'icônes distinctes pour les ZIP (💼)
- Ajout du bouton "multi" pour l'upload multiple
- Installation et configuration du module Archiver pour la création de ZIP
- Mise à jour complète de la documentation

### 06/05/2025
- Ajout de la fonctionnalité d'upload de liens vidéo
- Implémentation des boutons de sélection du type de contenu (PDF/vidéo) en orange clair
- Ajout d'icônes distinctes pour les PDF (📄) et les vidéos (🎬)
- Adaptation du serveur pour traiter les liens vidéo comme des "fichiers virtuels"

### 05/05/2025
- Modification de l'icône pour le cours d'anglais : remplacement par le drapeau anglais spécifique (🏴󠁧󠁢󠁥󠁮󠁧󠁿) pour améliorer l'affichage
- Documentation complète des éléments de design Java dans le README
- Documentation des icônes thématiques pour chaque cours
- Amélioration de la documentation technique concernant l'interface utilisateur