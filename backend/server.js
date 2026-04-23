require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb, saveDb, exec } = require('./config/database');

let server;

async function start() {
  await getDb();

  const schema = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf-8');
  exec(schema);
  saveDb();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Sauvegarder la DB après chaque requête modifiante
  app.use((req, res, next) => {
    const original = res.json.bind(res);
    res.json = (data) => {
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
        try { saveDb(); } catch (e) { }
      }
      return original(data);
    };
    next();
  });

  // Servir le frontend
  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  // Routes API
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/items', require('./routes/items'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/wallet', require('./routes/wallet'));
  app.use('/api/loans', require('./routes/loans'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/phone', require('./routes/phone'));
  app.use('/api/swipes', require('./routes/swipes'));
  app.use('/api/db', require('./routes/db'));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });

  server = app.listen(PORT, () => {
    console.log(`Shapio backend démarré sur http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} occupé, nouvelle tentative dans 1s...`);
      setTimeout(() => {
        server.close();
        server = app.listen(PORT);
      }, 1000);
    }
  });
}

// Fermeture propre pour --watch et Ctrl+C
function shutdown() {
  if (server) {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch(err => {
  console.error('Erreur au démarrage:', err);
  process.exit(1);
});
