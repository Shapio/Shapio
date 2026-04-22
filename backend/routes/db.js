const express = require('express');
const { prepare } = require('../config/database');

const router = express.Router();

// GET /api/db/tables — lister les tables
router.get('/tables', (req, res) => {
  const tables = prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  res.json(tables.map(t => t.name));
});

// GET /api/db/table/:name — contenu d'une table
router.get('/table/:name', (req, res) => {
  const allowed = ['users', 'items', 'loans', 'transactions', 'messages', 'reviews', 'swipes', 'phone_codes'];
  const tableName = req.params.name;

  if (!allowed.includes(tableName)) {
    return res.status(400).json({ error: 'Table non autorisée' });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  // Pour la table users, on ne renvoie pas le mot de passe
  let query;
  if (tableName === 'users') {
    query = `SELECT id, first_name, last_name, email, city, phone, phone_verified, id_verified, selfie_verified, points, rating, total_loans, total_borrows, created_at FROM users LIMIT ? OFFSET ?`;
  } else {
    query = `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`;
  }

  const rows = prepare(query).all(limit, offset);
  const countResult = prepare(`SELECT COUNT(*) as total FROM ${tableName}`).get();

  res.json({ table: tableName, total: countResult.total, rows });
});

// GET /api/db/query — requête SQL en lecture seule (GET uniquement)
router.get('/query', (req, res) => {
  const { sql } = req.query;

  if (!sql) {
    return res.status(400).json({ error: 'Paramètre sql requis' });
  }

  // Bloquer les requêtes modifiantes
  const upper = sql.trim().toUpperCase();
  if (!upper.startsWith('SELECT')) {
    return res.status(400).json({ error: 'Seules les requêtes SELECT sont autorisées' });
  }

  try {
    const rows = prepare(sql).all();
    res.json({ rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
