PRAGMA foreign_keys = ON;

ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN last_event_created_at INTEGER NOT NULL DEFAULT 0;
