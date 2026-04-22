CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  phone_verified INTEGER DEFAULT 0,
  id_verified INTEGER DEFAULT 0,
  selfie_verified INTEGER DEFAULT 0,
  points INTEGER DEFAULT 50,
  rating REAL DEFAULT 0,
  total_loans INTEGER DEFAULT 0,
  total_borrows INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📦',
  bg_color TEXT DEFAULT '#E1F5EE',
  points_per_day INTEGER NOT NULL,
  category TEXT DEFAULT 'Autre',
  condition TEXT DEFAULT 'Bon état',
  available INTEGER DEFAULT 1,
  max_duration_days INTEGER DEFAULT 7,
  weekday_hours TEXT DEFAULT 'Après 18h',
  weekend_hours TEXT DEFAULT 'Toute la journée',
  latitude REAL,
  longitude REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  borrower_id INTEGER NOT NULL,
  lender_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, active, completed, cancelled
  points_locked INTEGER NOT NULL,
  days INTEGER DEFAULT 1,
  started_at TEXT,
  returned_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (borrower_id) REFERENCES users(id),
  FOREIGN KEY (lender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  loan_id INTEGER,
  type TEXT NOT NULL,  -- bonus, loan_earned, loan_spent, locked, unlocked
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (loan_id) REFERENCES loans(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (loan_id) REFERENCES loans(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (target_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS swipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  direction TEXT NOT NULL,  -- left, right
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  UNIQUE(user_id, item_id)
);
