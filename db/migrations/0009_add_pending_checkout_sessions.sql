CREATE TABLE billing_checkout_sessions (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_token TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  checkout_url TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
