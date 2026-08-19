PRAGMA foreign_keys = ON;

-- Better Auth core tables. Keep these names in sync with Better Auth's generated schema.
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_userId_idx ON session(userId);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS account_userId_idx ON account(userId);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS study_books (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS study_books_user_created_idx
  ON study_books(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dictionary_entries (
  normalized_term TEXT PRIMARY KEY NOT NULL,
  term TEXT NOT NULL,
  translation TEXT NOT NULL,
  source_name TEXT NOT NULL DEFAULT 'EJDict',
  source_version TEXT,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS example_sentences (
  id TEXT PRIMARY KEY NOT NULL,
  normalized_term TEXT NOT NULL,
  sentence TEXT NOT NULL,
  source_id TEXT NOT NULL,
  author TEXT,
  source_url TEXT,
  license TEXT NOT NULL DEFAULT 'CC BY 2.0 FR'
);

CREATE INDEX IF NOT EXISTS example_sentences_term_idx
  ON example_sentences(normalized_term);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY NOT NULL,
  book_id TEXT NOT NULL REFERENCES study_books(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  translation TEXT,
  sentence TEXT,
  sentence_source_id TEXT,
  sentence_author TEXT,
  sentence_source_url TEXT,
  term_audio_key TEXT,
  sentence_audio_key TEXT,
  term_audio_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (term_audio_status IN ('pending', 'ready', 'failed')),
  sentence_audio_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sentence_audio_status IN ('pending', 'ready', 'failed')),
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS cards_book_idx ON cards(book_id, created_at);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  reviewed_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  repetitions INTEGER NOT NULL DEFAULT 0,
  request_id TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS reviews_card_due_idx ON reviews(card_id, due_at);
CREATE INDEX IF NOT EXISTS reviews_user_due_idx ON reviews(user_id, due_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TEXT
);

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
