require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { getDb, saveDb, prepare, exec } = require('../config/database');

async function init() {
  await getDb();

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  exec(schema);

  const hash = bcrypt.hashSync('password123', 10);

  const insertUser = prepare(
    `INSERT OR IGNORE INTO users (first_name, last_name, email, password, city, phone, phone_verified, id_verified, points, rating, total_loans, total_borrows)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const users = [
    ['Karim', 'M.', 'karim@shapio.fr', hash, 'Mulhouse', '+33612345678', 1, 1, 72, 4.9, 12, 5],
    ['Marie', 'L.', 'marie@shapio.fr', hash, 'Mulhouse', '+33698765432', 1, 1, 85, 4.9, 23, 8],
    ['Thomas', 'R.', 'thomas@shapio.fr', hash, 'Mulhouse', '+33611223344', 1, 0, 60, 4.7, 6, 10],
    ['Sophie', 'M.', 'sophie@shapio.fr', hash, 'Mulhouse', '+33655667788', 1, 1, 45, 4.8, 15, 3],
  ];
  users.forEach(u => insertUser.run(...u));

  const insertItem = prepare(
    `INSERT OR IGNORE INTO items (owner_id, title, description, icon, bg_color, points_per_day, category, condition, max_duration_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const items = [
    [2, 'Drone DJI Mini 3', 'Drone compact 4K avec stabilisateur. Autonomie ~34 min. Livré avec 2 batteries, chargeur et pochette.', '🚁', '#E1F5EE', 15, 'Tech', 'Très bon état', 3],
    [3, 'Manette PS5', 'Manette DualSense sans fil, parfait état.', '🎮', '#EEEDFE', 8, 'Tech', 'Bon état', 7],
    [1, 'Perceuse Bosch', 'Perceuse à percussion avec coffret et forets.', '🔧', '#FAEEDA', 10, 'Maison', 'Bon état', 5],
    [4, 'Tente 4 places', 'Tente Quechua Fresh&Black, montage rapide.', '🏕', '#FAECE7', 20, 'Sport', 'Très bon état', 4],
    [4, 'Appareil Sony A7', 'Appareil photo hybride plein format avec objectif 28-70mm.', '📷', '#EEEDFE', 25, 'Tech', 'Excellent état', 3],
    [2, 'Trottinette élec.', 'Xiaomi Mi Scooter Pro 2, 45km autonomie.', '🛴', '#FAEEDA', 18, 'Sport', 'Bon état', 3],
    [3, 'Guitare acoustique', 'Yamaha FG800, idéale débutant/intermédiaire.', '🎸', '#FAECE7', 14, 'Autre', 'Très bon état', 7],
    [1, 'MacBook Pro', 'MacBook Pro M2 14 pouces, 16Go RAM.', '💻', '#EEEDFE', 20, 'Tech', 'Très bon état', 3],
  ];
  items.forEach(i => insertItem.run(...i));

  saveDb();
  console.log('Base de données initialisée avec les données de démo.');
  process.exit(0);
}

init().catch(err => { console.error(err); process.exit(1); });
