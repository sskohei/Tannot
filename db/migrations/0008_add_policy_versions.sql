PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN terms_version TEXT;
ALTER TABLE users ADD COLUMN privacy_version TEXT;
ALTER TABLE users ADD COLUMN eligibility_confirmed_at TEXT;
