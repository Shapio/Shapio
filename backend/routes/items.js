const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { category, limit = 20, offset = 0 } = req.query;

  let query = `
    SELECT items.*, users.first_name || ' ' || users.last_name AS owner_name, users.rating AS owner_rating
    FROM items
    JOIN users ON items.owner_id = users.id
    WHERE items.available = 1
  `;
  const params = [];

  if (category && category !== 'Tout') {
    query += ' AND items.category = ?';
    params.push(category);
  }

  query += ' ORDER BY items.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const items = prepare(query).all(...params);
  res.json(items);
});

router.get('/:id', (req, res) => {
  const item = prepare(`
    SELECT items.*, users.first_name || ' ' || users.last_name AS owner_name,
           users.rating AS owner_rating, users.total_loans AS owner_loans,
           users.id_verified AS owner_verified, users.created_at AS owner_since
    FROM items
    JOIN users ON items.owner_id = users.id
    WHERE items.id = ?
  `).get(Number(req.params.id));

  if (!item) return res.status(404).json({ error: 'Objet introuvable' });

  const reviews = prepare(`
    SELECT reviews.*, users.first_name || ' ' || users.last_name AS author_name
    FROM reviews
    JOIN loans ON reviews.loan_id = loans.id
    JOIN users ON reviews.author_id = users.id
    WHERE loans.item_id = ?
    ORDER BY reviews.created_at DESC
    LIMIT 5
  `).all(Number(req.params.id));

  res.json({ ...item, reviews });
});

router.post('/', authenticate, (req, res) => {
  const { title, description, icon, bg_color, points_per_day, category, condition, max_duration_days } = req.body;

  if (!title || !points_per_day) {
    return res.status(400).json({ error: 'Titre et prix en points requis' });
  }

  const result = prepare(`
    INSERT INTO items (owner_id, title, description, icon, bg_color, points_per_day, category, condition, max_duration_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, title, description || '', icon || '📦', bg_color || '#E1F5EE', points_per_day, category || 'Autre', condition || 'Bon état', max_duration_days || 7);

  const item = prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

router.patch('/:id', authenticate, (req, res) => {
  const item = prepare('SELECT * FROM items WHERE id = ? AND owner_id = ?').get(Number(req.params.id), req.userId);
  if (!item) return res.status(404).json({ error: 'Objet introuvable ou non autorisé' });

  const fields = ['title', 'description', 'icon', 'bg_color', 'points_per_day', 'category', 'condition', 'available', 'max_duration_days'];
  const updates = [];
  const values = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });

  values.push(Number(req.params.id));
  prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = prepare('SELECT * FROM items WHERE id = ?').get(Number(req.params.id));
  res.json(updated);
});

router.delete('/:id', authenticate, (req, res) => {
  const result = prepare('DELETE FROM items WHERE id = ? AND owner_id = ?').run(Number(req.params.id), req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Objet introuvable ou non autorisé' });
  res.json({ message: 'Objet supprimé' });
});

module.exports = router;
