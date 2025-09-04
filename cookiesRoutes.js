/**
  Site web de partage de synthèses académiques - CoockiesRoutes.JS
  Gestion des cookies
  @author: Thomas Bauwens
  @date : Septembre 2025
  @modifiéDate : 
*/

const express = require('express');
const router = express.Router();
const { saveConsent } = require('./cookies');

router.post('/cookies-consent', (req, res) => {
  const { userId, accepted, info } = req.body; // <-- info récupérée
  if (!userId) return res.status(400).json({ success: false, message: 'userId requis' });

  if (accepted) {
    const entry = saveConsent(userId, true, info); // <-- info transmise
    res.json({ success: true, entry });
  } else {
    res.json({ success: true, message: 'Consentement refusé, rien sauvegardé.' });
  }
});


module.exports = router;
