/**
  Site web de partage de synthèses académiques - Coockies.JS
  Gestion des cookies
  @author: Thomas Bauwens
  @date : Septembre 2025
  @modifiéDate : 
*/

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cookies.json');

function saveConsent(userId, cookiesAccepted, info = {}) {
  if (!userId) throw new Error('userId requis');

  let data = [];
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  const index = data.findIndex(e => e.userId === userId);
  const entry = { 
    userId,
    cookiesAccepted: !!cookiesAccepted,
    date: new Date().toISOString(),
    info // <- on stocke les infos techniques ici
  };

  if (index >= 0) {
    data[index] = entry;
  } else {
    data.push(entry);
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return entry;
}

function getConsent(userId) {
  let data = [];
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return data.find(e => e.userId === userId) || { userId, cookiesAccepted: false };
}

module.exports = { saveConsent, getConsent };
