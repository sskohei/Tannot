PRAGMA foreign_keys = ON;

-- Dictionary and example data are now shipped as read-only Worker assets.
-- Cards already contain their lookup snapshot, so removing these legacy MVP
-- tables does not change existing study books.
DROP TABLE IF EXISTS example_sentences;
DROP TABLE IF EXISTS dictionary_entries;
