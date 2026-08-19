PRAGMA foreign_keys = ON;

ALTER TABLE cards DROP COLUMN term_audio_key;
ALTER TABLE cards DROP COLUMN sentence_audio_key;
ALTER TABLE cards DROP COLUMN term_audio_status;
ALTER TABLE cards DROP COLUMN sentence_audio_status;
