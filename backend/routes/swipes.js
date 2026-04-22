const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

// POST /api/swipes — enregistrer un swipe
router.post('/', authenticate, (req, res) => {
  const { item_id, direction } = req.body;

  if (!item_id || !direction) {
    return res.status(400).json({ error: 'item_id et direction requis' });
  }

  // Vérifier si déjà swipé
  const existing = prepare('SELECT id FROM swipes WHERE user_id = ? AND item_id = ?').get(req.userId, item_id);
  if (existing) {
    return res.json({ already_swiped: true });
  }

  prepare('INSERT INTO swipes (user_id, item_id, direction) VALUES (?, ?, ?)').run(req.userId, item_id, direction);

  // Si c'est un like, vérifier si l'owner a aussi liké un objet de cet utilisateur (= match)
  let match = false;
  if (direction === 'right') {
    const item = prepare('SELECT owner_id FROM items WHERE id = ?').get(item_id);
    if (item) {
      const reverseSwipe = prepare(`
        SELECT s.id FROM swipes s
        JOIN items i ON s.item_id = i.id
        WHERE s.user_id = ? AND i.owner_id = ? AND s.direction = 'right'
      `).get(item.owner_id, req.userId);
      match = !!reverseSwipe;
    }
  }

  res.json({ recorded: true, match });
});

// GET /api/swipes/unswiped — objets pas encore swipés
router.get('/unswiped', authenticate, (req, res) => {
  const { category } = req.query;

  let query = `
    SELECT items.*, users.first_name || ' ' || users.last_name AS owner_name, users.rating AS owner_rating
    FROM items
    JOIN users ON items.owner_id = users.id
    WHERE items.available = 1
      AND items.owner_id != ?
      AND items.id NOT IN (SELECT item_id FROM swipes WHERE user_id = ?)
  `;
  const params = [req.userId, req.userId];

  if (category && category !== 'Tout') {
    query += ' AND items.category = ?';
    params.push(category);
  }

  query += ' ORDER BY RANDOM() LIMIT 20';

  const items = prepare(query).all(...params);
  res.json(items);
});

module.exports = router;
