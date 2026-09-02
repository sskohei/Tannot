ALTER TABLE study_books ADD COLUMN folder_name TEXT NOT NULL DEFAULT '';
ALTER TABLE study_books ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
UPDATE study_books SET sort_order = rowid WHERE sort_order = 0;

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS card_tags (
  card_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (card_id, tag_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag ON card_tags(tag_id);

CREATE TABLE IF NOT EXISTS learning_preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  daily_review_limit INTEGER NOT NULL DEFAULT 50,
  daily_new_card_limit INTEGER NOT NULL DEFAULT 20,
  review_order TEXT NOT NULL DEFAULT 'new_first' CHECK(review_order IN ('new_first', 'due_first')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reminder_preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT NOT NULL DEFAULT '19:00',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
