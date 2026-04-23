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

  // --- USERS ---
  const insertUser = prepare(
    `INSERT OR IGNORE INTO users (first_name, last_name, email, password, city, phone, phone_verified, id_verified, selfie_verified, points, rating, total_loans, total_borrows)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const users = [
    ['Karim', 'M.', 'karim@shapio.fr', hash, 'Mulhouse', '+33612345678', 1, 1, 0, 72, 4.9, 12, 5],
    ['Marie', 'L.', 'marie@shapio.fr', hash, 'Mulhouse', '+33698765432', 1, 1, 1, 85, 4.9, 23, 8],
    ['Thomas', 'R.', 'thomas@shapio.fr', hash, 'Mulhouse', '+33611223344', 1, 0, 0, 60, 4.7, 6, 10],
    ['Sophie', 'M.', 'sophie@shapio.fr', hash, 'Mulhouse', '+33655667788', 1, 1, 1, 45, 4.8, 15, 3],
    ['Lucas', 'F.', 'lucas@shapio.fr', hash, 'Mulhouse', '+33699887766', 1, 1, 0, 55, 4.6, 4, 7],
  ];
  users.forEach(u => insertUser.run(...u));

  // --- ITEMS ---
  const insertItem = prepare(
    `INSERT OR IGNORE INTO items (owner_id, title, description, icon, bg_color, points_per_day, category, condition, max_duration_days, weekday_hours, weekend_hours)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const items = [
    [2, 'Drone DJI Mini 3', 'Drone compact 4K avec stabilisateur. Autonomie ~34 min. Livré avec 2 batteries, chargeur et pochette.', '🚁', '#E1F5EE', 15, 'Tech', 'Très bon état', 3, 'Après 18h', 'Toute la journée'],
    [3, 'Manette PS5', 'Manette DualSense sans fil, parfait état. Compatible PC.', '🎮', '#EEEDFE', 8, 'Tech', 'Bon état', 7, 'Toute la journée', 'Toute la journée'],
    [1, 'Perceuse Bosch', 'Perceuse à percussion avec coffret et forets. Idéale bricolage.', '🔧', '#FAEEDA', 10, 'Maison', 'Bon état', 5, 'Après 18h', 'Toute la journée'],
    [4, 'Tente 4 places', 'Tente Quechua Fresh&Black, montage rapide. Imperméable.', '🏕', '#FAECE7', 20, 'Sport', 'Très bon état', 4, 'Après 17h', 'Toute la journée'],
    [4, 'Appareil Sony A7', 'Appareil photo hybride plein format avec objectif 28-70mm.', '📷', '#EEEDFE', 25, 'Tech', 'Excellent état', 3, 'Après 18h', 'Matin'],
    [2, 'Trottinette élec.', 'Xiaomi Mi Scooter Pro 2, 45km autonomie.', '🛴', '#FAEEDA', 18, 'Sport', 'Bon état', 3, 'Après 18h', 'Toute la journée'],
    [3, 'Guitare acoustique', 'Yamaha FG800, idéale débutant/intermédiaire.', '🎸', '#FAECE7', 14, 'Autre', 'Très bon état', 7, 'Toute la journée', 'Toute la journée'],
    [1, 'MacBook Pro', 'MacBook Pro M2 14 pouces, 16Go RAM.', '💻', '#EEEDFE', 20, 'Tech', 'Très bon état', 3, 'Après 19h', 'Toute la journée'],
    [5, 'Aspirateur Dyson', 'Dyson V15 Detect sans fil, très puissant.', '🧹', '#FAECE7', 12, 'Maison', 'Bon état', 5, 'Après 18h', 'Toute la journée'],
    [5, 'Tondeuse Bosch', 'Tondeuse à gazon électrique Bosch Rotak 43.', '🌿', '#E1F5EE', 8, 'Jardinage', 'Bon état', 3, 'Après 17h', 'Matin'],
    [2, 'Projecteur BenQ', 'Projecteur Full HD BenQ TH671ST, courte focale.', '📽', '#EEEDFE', 22, 'Tech', 'Très bon état', 2, 'Après 18h', 'Toute la journée'],
    [4, 'Vélo VTT Rockrider', 'VTT Rockrider ST540, taille M, 27.5 pouces.', '🚲', '#FAEEDA', 15, 'Sport', 'Bon état', 5, 'Après 17h', 'Toute la journée'],
  ];
  items.forEach(i => insertItem.run(...i));

  // --- LOANS (completed) ---
  const insertLoan = prepare(
    `INSERT OR IGNORE INTO loans (item_id, borrower_id, lender_id, status, points_locked, days, started_at, returned_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?), datetime('now', ?))`
  );

  // Karim a emprunté le drone de Marie (terminé)
  insertLoan.run(1, 1, 2, 'completed', 15, 1, '-5 days', '-4 days', '-6 days');
  // Karim a emprunté la manette de Thomas (terminé)
  insertLoan.run(2, 1, 3, 'completed', 8, 1, '-10 days', '-9 days', '-11 days');
  // Thomas a emprunté la perceuse de Karim (terminé)
  insertLoan.run(3, 3, 1, 'completed', 30, 3, '-15 days', '-12 days', '-16 days');
  // Sophie a emprunté le drone de Marie (terminé)
  insertLoan.run(1, 4, 2, 'completed', 30, 2, '-20 days', '-18 days', '-21 days');
  // Marie a emprunté la tente de Sophie (active)
  insertLoan.run(4, 2, 4, 'active', 20, 1, '-1 days', null, '-2 days');

  // --- TRANSACTIONS ---
  const insertTx = prepare(
    `INSERT OR IGNORE INTO transactions (user_id, loan_id, type, amount, description, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', ?))`
  );

  // Bonus inscription pour tous
  [1,2,3,4,5].forEach(uid => insertTx.run(uid, null, 'bonus', 50, 'Bonus inscription', '-30 days'));

  // Karim emprunt drone (-15)
  insertTx.run(1, 1, 'locked', -15, 'Emprunt: Drone DJI Mini 3', '-6 days');
  // Marie reçoit pour drone (+15)
  insertTx.run(2, 1, 'loan_earned', 15, 'Prêt terminé: Drone DJI Mini 3', '-4 days');
  // Karim emprunt manette (-8)
  insertTx.run(1, 2, 'locked', -8, 'Emprunt: Manette PS5', '-11 days');
  // Thomas reçoit pour manette (+8)
  insertTx.run(3, 2, 'loan_earned', 8, 'Prêt terminé: Manette PS5', '-9 days');
  // Thomas emprunt perceuse (-30)
  insertTx.run(3, 3, 'locked', -30, 'Emprunt: Perceuse Bosch', '-16 days');
  // Karim reçoit pour perceuse (+30)
  insertTx.run(1, 3, 'loan_earned', 30, 'Prêt terminé: Perceuse Bosch', '-12 days');
  // Sophie emprunt drone (-30)
  insertTx.run(4, 4, 'locked', -30, 'Emprunt: Drone DJI Mini 3', '-21 days');
  // Marie reçoit pour drone (+30)
  insertTx.run(2, 4, 'loan_earned', 30, 'Prêt terminé: Drone DJI Mini 3', '-18 days');
  // Marie emprunt tente (active, -20)
  insertTx.run(2, 5, 'locked', -20, 'Emprunt: Tente 4 places', '-2 days');

  // --- REVIEWS ---
  const insertReview = prepare(
    `INSERT OR IGNORE INTO reviews (loan_id, author_id, target_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', ?))`
  );

  insertReview.run(1, 1, 2, 5, 'Drone en parfait état, Marie très sympa !', '-4 days');
  insertReview.run(1, 2, 1, 5, 'Karim très respectueux, objet rendu impeccable.', '-4 days');
  insertReview.run(2, 1, 3, 4, 'Manette en bon état, merci Thomas.', '-9 days');
  insertReview.run(3, 3, 1, 5, 'Perceuse parfaite, Karim très arrangeant.', '-12 days');
  insertReview.run(4, 4, 2, 5, 'Super expérience, objet comme décrit.', '-18 days');
  insertReview.run(4, 2, 4, 5, 'Sophie très sympa, rendu dans les temps.', '-18 days');

  // --- MESSAGES ---
  const insertMsg = prepare(
    `INSERT OR IGNORE INTO messages (sender_id, receiver_id, content, read, created_at)
     VALUES (?, ?, ?, ?, datetime('now', ?))`
  );

  // Conversation Karim <-> Marie
  insertMsg.run(2, 1, 'Salut Karim ! Le drone est dispo ce weekend si tu veux.', 1, '-6 days');
  insertMsg.run(1, 2, 'Super ! Je passe samedi matin ?', 1, '-6 days');
  insertMsg.run(2, 1, 'Parfait, vers 10h chez moi.', 1, '-6 days');
  insertMsg.run(1, 2, 'Merci Marie, drone rendu ! Excellent vol.', 1, '-4 days');
  insertMsg.run(2, 1, 'Avec plaisir, à bientôt !', 0, '-4 days');

  // Conversation Karim <-> Thomas
  insertMsg.run(3, 1, 'Hey, la manette PS5 est dispo si tu veux tester.', 1, '-12 days');
  insertMsg.run(1, 3, 'Carrément, je passe demain ?', 1, '-12 days');
  insertMsg.run(3, 1, 'Ok pour samedi !', 1, '-11 days');

  // Conversation Karim <-> Sophie
  insertMsg.run(4, 1, 'Salut ! Tu as des forets pour le béton avec ta perceuse ?', 1, '-20 days');
  insertMsg.run(1, 4, 'Oui, j\'ai un coffret complet.', 1, '-20 days');

  // --- NOTIFICATIONS ---
  const insertNotif = prepare(
    `INSERT INTO notifications (user_id, type, title, body, read, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', ?))`
  );

  // Karim
  insertNotif.run(1, 'welcome', 'Bienvenue sur Shapio ! 🎉', 'Tu as reçu 50 points de bienvenue. Publie un objet ou explore autour de toi.', 1, '-30 days');
  insertNotif.run(1, 'loan_request', 'Nouvelle demande d\'emprunt', 'Thomas souhaite emprunter "Perceuse Bosch" pour 3 jour(s).', 1, '-16 days');
  insertNotif.run(1, 'points', 'Points reçus ! 💰', 'Tu as reçu 30 pts pour le prêt de la Perceuse Bosch.', 1, '-12 days');
  insertNotif.run(1, 'review', 'Nouvel avis ⭐', 'Thomas R. t\'a donné 5 étoiles : "Perceuse parfaite, Karim très arrangeant."', 0, '-12 days');
  insertNotif.run(1, 'message', 'Nouveau message', 'Marie : "Avec plaisir, à bientôt !"', 0, '-4 days');
  insertNotif.run(1, 'loan_request', 'Demande d\'emprunt acceptée', 'Marie a accepté ta demande pour le Drone DJI Mini 3.', 0, '-5 days');

  // Marie
  insertNotif.run(2, 'welcome', 'Bienvenue sur Shapio ! 🎉', 'Tu as reçu 50 points de bienvenue.', 1, '-30 days');
  insertNotif.run(2, 'loan_request', 'Nouvelle demande d\'emprunt', 'Karim souhaite emprunter "Drone DJI Mini 3" pour 1 jour(s).', 1, '-6 days');
  insertNotif.run(2, 'review', 'Nouvel avis ⭐', 'Karim M. t\'a donné 5 étoiles.', 0, '-4 days');

  // Thomas
  insertNotif.run(3, 'welcome', 'Bienvenue sur Shapio ! 🎉', 'Tu as reçu 50 points de bienvenue.', 1, '-30 days');
  insertNotif.run(3, 'loan_returned', 'Retour confirmé', 'Le retour de "Perceuse Bosch" a été confirmé. 30 pts transférés.', 1, '-12 days');

  saveDb();
  console.log('Base de données initialisée avec les données de démo.');
  process.exit(0);
}

init().catch(err => { console.error(err); process.exit(1); });
