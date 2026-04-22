const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

// En mode dev : le code est toujours 1234
// En production : intégrer Twilio / Vonage / OVH SMS
const DEV_MODE = process.env.SMS_PROVIDER !== 'twilio';

// POST /api/phone/send-code — envoyer un code SMS
router.post('/send-code', (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Numéro de téléphone requis' });
  }

  const code = DEV_MODE ? '1234' : String(Math.floor(1000 + Math.random() * 9000));

  // Supprimer les anciens codes pour ce numéro
  prepare('DELETE FROM phone_codes WHERE phone = ? AND verified = 0').run(phone);

  // Sauvegarder le nouveau code
  prepare('INSERT INTO phone_codes (phone, code) VALUES (?, ?)').run(phone, code);

  if (DEV_MODE) {
    console.log(`[DEV SMS] Code pour ${phone}: ${code}`);
    return res.json({ message: 'Code envoyé (mode dev: 1234)', dev_code: code });
  }

  // TODO: En production, envoyer le SMS via Twilio/Vonage
  // await twilioClient.messages.create({ body: `Shapio: votre code est ${code}`, to: phone, from: TWILIO_NUMBER });

  res.json({ message: 'Code SMS envoyé' });
});

// POST /api/phone/verify — vérifier le code
router.post('/verify', (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Numéro et code requis' });
  }

  const record = prepare(
    'SELECT * FROM phone_codes WHERE phone = ? AND code = ? AND verified = 0 ORDER BY created_at DESC'
  ).get(phone, code);

  if (!record) {
    return res.status(400).json({ error: 'Code invalide ou expiré' });
  }

  prepare('UPDATE phone_codes SET verified = 1 WHERE id = ?').run(record.id);

  res.json({ verified: true });
});

// POST /api/phone/confirm — associer le téléphone vérifié à l'utilisateur connecté
router.post('/confirm', authenticate, (req, res) => {
  const { phone } = req.body;

  const verified = prepare(
    'SELECT * FROM phone_codes WHERE phone = ? AND verified = 1 ORDER BY created_at DESC'
  ).get(phone);

  if (!verified) {
    return res.status(400).json({ error: 'Ce numéro n\'a pas été vérifié' });
  }

  prepare('UPDATE users SET phone = ?, phone_verified = 1 WHERE id = ?').run(phone, req.userId);

  res.json({ message: 'Téléphone vérifié et associé au compte' });
});

module.exports = router;
