/**
  Site web de partage de synthèses académiques - cookiesConsent.js
  Gestion des cookies sur toutes les pages
  @author: Thomas Bauwens
  @date : Septembre 2025
*/

// Fonction pour lire un cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Générer un ID unique pour l'utilisateur
function generateUserId() {
  return 'user-' + Math.random().toString(36).substring(2, 12);
}

// Récupérer ou créer l'userId
let userId = getCookie('userId');
if (!userId) {
  userId = generateUserId();
  // Cookie de 13 mois (en secondes)
  document.cookie = `userId=${userId}; max-age=${13*30*24*60*60}; path=/`;
}

// Afficher le popup si pas encore de consentement
const cookieConsent = getCookie('cookiesAccepted');
if (cookieConsent !== 'true' && cookieConsent !== 'false') {
  const popup = document.getElementById('cookiePopup');
  if (popup) popup.style.display = 'block';
}

// Fonction pour envoyer le consentement au serveur
function sendConsent(accepted) {
  const info = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    referrer: document.referrer,
    timezoneOffset: new Date().getTimezoneOffset(),
    platform: navigator.platform
  };

  fetch('/cookies-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, accepted, info })
  })
  .then(res => res.json())
  .then(() => {
    // Cookie cookiesAccepted valable 1h
    document.cookie = `cookiesAccepted=${accepted}; max-age=${60*60}; path=/`;
    const popup = document.getElementById('cookiePopup');
    if (popup) popup.style.display = 'none';
  })
  .catch(err => console.error('Erreur consentement cookies:', err));
}

// Bouton "J'accepte"
const acceptBtn = document.getElementById('acceptCookies');
if (acceptBtn) {
  acceptBtn.addEventListener('click', () => sendConsent(true));
}

// Bouton "Je refuse"
const refuseBtn = document.getElementById('refuseCookies');
if (refuseBtn) {
  refuseBtn.addEventListener('click', () => sendConsent(false));
}
