INSERT OR IGNORE INTO dictionary_entries (normalized_term, term, translation, source_name, source_version)
VALUES
  ('run', 'run', '走る、運営する', 'EJDict', 'seed'),
  ('give up', 'give up', 'あきらめる、降参する', 'EJDict', 'seed'),
  ('look forward to', 'look forward to', '楽しみに待つ', 'EJDict', 'seed');

INSERT OR IGNORE INTO example_sentences (id, normalized_term, sentence, source_id, author, source_url)
VALUES
  ('seed-run', 'run', 'I run every morning.', 'seed-run', 'Tannot seed', 'https://tatoeba.org/'),
  ('seed-give-up', 'give up', 'Never give up on your goals.', 'seed-give-up', 'Tannot seed', 'https://tatoeba.org/'),
  ('seed-look-forward-to', 'look forward to', 'I look forward to seeing you.', 'seed-look-forward-to', 'Tannot seed', 'https://tatoeba.org/');
