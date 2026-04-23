const express = require('express');
const { prepare } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', authenticate, (req, res) => {
  const conversations = prepare(`
    SELECT
      CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS contact_id,
      users.first_name || ' ' || users.last_name AS contact_name,
      content AS last_message,
      messages.created_at AS last_message_at,
      SUM(CASE WHEN messages.read = 0 AND receiver_id = ? THEN 1 ELSE 0 END) AS unread_count
    FROM messages
    JOIN users ON users.id = CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
    WHERE sender_id = ? OR receiver_id = ?
    GROUP BY contact_id
    ORDER BY messages.created_at DESC
  `).all(req.userId, req.userId, req.userId, req.userId, req.userId);

  res.json(conversations);
});

router.get('/:userId', authenticate, (req, res) => {
  const contactId = Number(req.params.userId);

  const messages = prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(req.userId, contactId, contactId, req.userId);

  prepare(`
    UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0
  `).run(contactId, req.userId);

  res.json(messages);
});

router.post('/:userId', authenticate, (req, res) => {
  const { content } = req.body;
  const receiverId = Number(req.params.userId);

  if (!content) return res.status(400).json({ error: 'Message vide' });

  const receiver = prepare('SELECT id FROM users WHERE id = ?').get(receiverId);
  if (!receiver) return res.status(404).json({ error: 'Destinataire introuvable' });

  const result = prepare(
    'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
  ).run(req.userId, receiverId, content);

  const message = prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  // Notifier le destinataire
  const sender = prepare('SELECT first_name FROM users WHERE id = ?').get(req.userId);
  prepare(
    'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)'
  ).run(receiverId, 'message', 'Nouveau message', `${sender.first_name} : "${content.substring(0, 60)}${content.length > 60 ? '…' : ''}"`);

  res.status(201).json(message);
});

module.exports = router;
