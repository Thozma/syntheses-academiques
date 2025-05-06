# Plateforme de Partage de Synthèses Académiques

Une application web pour permettre aux étudiants de partager et consulter des synthèses de cours.

## Fonctionnalités

- Upload de fichiers PDF
- Organisation par cours avec icônes thématiques
- Formulaire de contact
- Notifications par email
- Interface responsive
- Sections pliables/dépliables
- Style inspiré de Java avec mots-clés colorés
- Animations subtiles pour améliorer l'expérience utilisateur

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

- `app.js` : Point d'entrée principal de l'application, gère le cycle de vie
- `server.js` : Serveur Node.js avec toutes les routes et la logique
- `index.html` : Interface utilisateur principale
- `style/style.css` : Styles CSS de l'application
- `config.js` : Configuration de l'application (SMTP, etc.)
- `config.example.js` : Exemple de configuration
- `ftp-credentials.js` : Identifiants pour le déploiement FTP
- `ftp-credentials.example.js` : Exemple de configuration FTP
- `deploy.js` : Script de déploiement FTP
- `Les synthèses des invités/` : Dossier contenant les fichiers uploadés
- `fichiers.json` : Base de données des fichiers uploadés
- `.htaccess` : Fichier nécessaire pour la configuration de l'hébergement LWS

## Sécurité

- Le fichier `config.js` contient des informations sensibles et ne doit pas être partagé
- Utilisez le fichier `.gitignore` pour éviter de partager des fichiers sensibles
- Les mots de passe et informations d'authentification sont stockés dans `config.js`

## Technologies Utilisées

- Node.js
- Express
- Multer (gestion des uploads)
- Nodemailer (envoi d'emails)
- JavaScript vanilla (frontend)
- CSS3

## Éléments de Design

### Thème Java

Le site utilise un thème inspiré du langage de programmation Java pour créer une ambiance technique adaptée aux étudiants en informatique :

- Mots-clés Java (`for`, `while`, `public static`, `new`, `import`, `void`, `submit`, `send`) affichés en rouge (#d73a49)
- Police Arial (non monospace) pour les mots-clés Java avec taille de 0.9em et poids normal
- Intégration des mots-clés dans les titres et boutons pour un effet visuel cohérent

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

- Formulaires avec espacement et alignement optimisés
- Formulaire de contact avec largeur de 420px et padding de 15px
- Champ email avec expansion automatique (flex: 1)
- Animations subtiles pour améliorer l'expérience utilisateur
- Sections de cours pliables/dépliables avec animation de flèche

## Auteur

Thomas Bauwens

## Licence

Tous droits réservés © 2025

## Journal des modifications

### 06/05/2025
- Modification de l'icône pour le cours d'anglais : remplacement par le drapeau anglais spécifique (🏴󠁧󠁢󠁥󠁮󠁧󠁿) pour améliorer l'affichage
- Documentation complète des éléments de design Java dans le README
- Documentation des icônes thématiques pour chaque cours
- Amélioration de la documentation technique concernant l'interface utilisateur
- Mise à jour de la liste des fonctionnalités pour inclure les éléments de style Java et les animations
