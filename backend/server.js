require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb, saveDb, exec } = require('./config/database');

async function start() {
  await getDb();

  // Initialiser le schéma
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
        saveDb();
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
  app.use('/api/phone', require('./routes/phone'));
  app.use('/api/swipes', require('./routes/swipes'));
  app.use('/api/db', require('./routes/db'));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Shapio backend démarré sur http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Erreur au démarrage:', err);
  process.exit(1);
});
