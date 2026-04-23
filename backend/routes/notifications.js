const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — liste des notifications
router.get('/', authenticate, (req, res) => {
  const notifs = prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
  `).all(req.userId);

  const unread = prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
  ).get(req.userId);

  res.json({ notifications: notifs, unread_count: unread.count });
});

// POST /api/notifications/read — marquer toutes comme lues
router.post('/read', authenticate, (req, res) => {
  prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.userId);
  res.json({ message: 'Notifications lues' });
});

// POST /api/notifications/read/:id — marquer une comme lue
router.post('/read/:id', authenticate, (req, res) => {
  prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.userId);
  res.json({ message: 'OK' });
});

module.exports = router;
