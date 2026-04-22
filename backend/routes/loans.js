const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, (req, res) => {
  const { item_id, days = 1 } = req.body;

  const item = prepare(`
    SELECT items.*, users.id AS lender_id
    FROM items JOIN users ON items.owner_id = users.id
    WHERE items.id = ? AND items.available = 1
  `).get(item_id);

  if (!item) return res.status(404).json({ error: 'Objet indisponible' });
  if (item.owner_id === req.userId) return res.status(400).json({ error: 'Vous ne pouvez pas emprunter votre propre objet' });

  const pointsNeeded = item.points_per_day * days;
  const user = prepare('SELECT points FROM users WHERE id = ?').get(req.userId);

  if (user.points < pointsNeeded) return res.status(400).json({ error: 'Points insuffisants' });

  const loan = prepare(`
    INSERT INTO loans (item_id, borrower_id, lender_id, points_locked, days, status, started_at)
    VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
  `).run(item_id, req.userId, item.lender_id, pointsNeeded, days);

  prepare('UPDATE users SET points = points - ? WHERE id = ?').run(pointsNeeded, req.userId);
  prepare(
    'INSERT INTO transactions (user_id, loan_id, type, amount, description) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, loan.lastInsertRowid, 'locked', -pointsNeeded, `Emprunt: ${item.title}`);
  prepare('UPDATE items SET available = 0 WHERE id = ?').run(item_id);

  res.status(201).json({ loanId: loan.lastInsertRowid, pointsLocked: pointsNeeded });
});

router.post('/:id/return', authenticate, (req, res) => {
  const loan = prepare('SELECT * FROM loans WHERE id = ? AND status = ?').get(Number(req.params.id), 'active');
  if (!loan) return res.status(404).json({ error: 'Prêt introuvable ou déjà terminé' });
  if (loan.lender_id !== req.userId) return res.status(403).json({ error: 'Seul le prêteur peut confirmer le retour' });

  prepare("UPDATE loans SET status = 'completed', returned_at = datetime('now') WHERE id = ?").run(loan.id);
  prepare('UPDATE users SET points = points + ?, total_loans = total_loans + 1 WHERE id = ?').run(loan.points_locked, loan.lender_id);
  prepare('UPDATE users SET total_borrows = total_borrows + 1 WHERE id = ?').run(loan.borrower_id);
  prepare(
    'INSERT INTO transactions (user_id, loan_id, type, amount, description) VALUES (?, ?, ?, ?, ?)'
  ).run(loan.lender_id, loan.id, 'loan_earned', loan.points_locked, 'Prêt terminé');
  prepare('UPDATE items SET available = 1 WHERE id = ?').run(loan.item_id);

  res.json({ message: 'Retour confirmé', pointsTransferred: loan.points_locked });
});

module.exports = router;
