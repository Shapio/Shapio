const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const user = prepare('SELECT points FROM users WHERE id = ?').get(req.userId);

  const transactions = prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.userId);

  const locked = prepare(`
    SELECT COALESCE(SUM(points_locked), 0) AS total FROM loans WHERE borrower_id = ? AND status = 'active'
  `).get(req.userId);

  const earned = prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
    WHERE user_id = ? AND amount > 0 AND created_at >= date('now', 'start of month')
  `).get(req.userId);

  const spent = prepare(`
    SELECT COALESCE(SUM(ABS(amount)), 0) AS total FROM transactions
    WHERE user_id = ? AND amount < 0 AND created_at >= date('now', 'start of month')
  `).get(req.userId);

  res.json({
    points: user.points,
    locked: locked.total,
    earned_this_month: earned.total,
    spent_this_month: spent.total,
    transactions,
  });
});

module.exports = router;
