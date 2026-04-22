const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, (req, res) => {
  const user = prepare(`
    SELECT id, first_name, last_name, email, city, phone, phone_verified,
           id_verified, selfie_verified, points, rating, total_loans, total_borrows, created_at
    FROM users WHERE id = ?
  `).get(req.userId);

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const items = prepare('SELECT * FROM items WHERE owner_id = ?').all(req.userId);
  const reviews = prepare(`
    SELECT reviews.*, users.first_name || ' ' || users.last_name AS author_name
    FROM reviews
    JOIN users ON reviews.author_id = users.id
    WHERE reviews.target_id = ?
    ORDER BY reviews.created_at DESC
  `).all(req.userId);

  res.json({ ...user, items, reviews });
});

router.get('/:id', (req, res) => {
  const user = prepare(`
    SELECT id, first_name, last_name, city, id_verified, points, rating,
           total_loans, total_borrows, created_at
    FROM users WHERE id = ?
  `).get(Number(req.params.id));

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const items = prepare('SELECT * FROM items WHERE owner_id = ? AND available = 1').all(Number(req.params.id));
  const reviews = prepare(`
    SELECT reviews.*, users.first_name || ' ' || users.last_name AS author_name
    FROM reviews
    JOIN users ON reviews.author_id = users.id
    WHERE reviews.target_id = ?
    ORDER BY reviews.created_at DESC
    LIMIT 10
  `).all(Number(req.params.id));

  res.json({ ...user, items, reviews });
});

module.exports = router;
