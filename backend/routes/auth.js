const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prepare } = require('../config/database');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, city } = req.body;

  if (!first_name || !last_name || !email || !password || !city) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  const existing = prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = prepare(
    'INSERT INTO users (first_name, last_name, email, password, city) VALUES (?, ?, ?, ?, ?)'
  ).run(first_name, last_name, email, hash, city);

  prepare(
    'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
  ).run(result.lastInsertRowid, 'bonus', 50, 'Bonus inscription');

  // Notification de bienvenue
  prepare(
    'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)'
  ).run(result.lastInsertRowid, 'welcome', 'Bienvenue sur Shapio ! 🎉', 'Tu as reçu 50 points de bienvenue. Commence par publier un objet ou explore les objets autour de toi.');

  const token = jwt.sign({ id: result.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, userId: result.lastInsertRowid });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = prepare('SELECT id, password FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, userId: user.id });
});

module.exports = router;
