import type { Card, DictionaryResult, StudyBook } from "@/lib/types";

type User = { id: string; email: string; name: string };

export async function ensureUser(db: D1Database, user: User): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, email, name) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name`,
    )
    .bind(user.id, user.email, user.name)
    .run();
}

export async function countUserBooks(db: D1Database, userId: string): Promise<number> {
  const result = await db.prepare("SELECT COUNT(*) AS count FROM study_books WHERE user_id = ?").bind(userId).first<{ count: number }>();
  return Number(result?.count ?? 0);
}

export async function findDictionaryResult(db: D1Database, normalizedTerm: string): Promise<DictionaryResult> {
  const dictionary = await db
    .prepare("SELECT translation FROM dictionary_entries WHERE normalized_term = ?")
    .bind(normalizedTerm)
    .first<{ translation: string }>();
  const example = await db
    .prepare(
      `SELECT sentence, source_id, author, source_url
       FROM example_sentences WHERE normalized_term = ? ORDER BY id LIMIT 1`,
    )
    .bind(normalizedTerm)
    .first<{ sentence: string; source_id: string; author: string | null; source_url: string | null }>();

  return {
    translation: dictionary?.translation ?? null,
    sentence: example?.sentence ?? null,
    sourceId: example?.source_id ?? null,
    author: example?.author ?? null,
    sourceUrl: example?.source_url ?? null,
  };
}

export async function createBook(
  db: D1Database,
  userId: string,
  title: string,
  cards: Array<{
    term: string;
    normalizedTerm: string;
    result: DictionaryResult;
    audioStatus: "pending" | "failed";
  }>,
): Promise<StudyBook> {
  const bookId = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    db.prepare("INSERT INTO study_books (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(bookId, userId, title, now, now),
    ...cards.map((card) => {
      const error = !card.result.translation || !card.result.sentence;
      return db
        .prepare(
          `INSERT INTO cards (
            id, book_id, term, normalized_term, translation, sentence,
            sentence_source_id, sentence_author, sentence_source_url,
            term_audio_status, sentence_audio_status, error_code, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          bookId,
          card.term,
          card.normalizedTerm,
          card.result.translation,
          card.result.sentence,
          card.result.sourceId,
          card.result.author,
          card.result.sourceUrl,
          card.audioStatus,
          card.audioStatus,
          error ? "LOOKUP_INCOMPLETE" : null,
          error ? "辞書または例文が見つかりませんでした" : null,
        );
    }),
  ];
  await db.batch(statements);
  return { id: bookId, user_id: userId, title, created_at: now, updated_at: now };
}

export async function listBooks(db: D1Database, userId: string): Promise<StudyBook[]> {
  const result = await db.prepare("SELECT * FROM study_books WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all<StudyBook>();
  return result.results;
}

export async function getBook(db: D1Database, userId: string, bookId: string): Promise<(StudyBook & { cards: Card[] }) | null> {
  const book = await db.prepare("SELECT * FROM study_books WHERE id = ? AND user_id = ?").bind(bookId, userId).first<StudyBook>();
  if (!book) return null;
  const cards = await db.prepare("SELECT * FROM cards WHERE book_id = ? ORDER BY created_at").bind(bookId).all<Card>();
  return { ...book, cards: cards.results };
}

export async function deleteBook(db: D1Database, userId: string, bookId: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM study_books WHERE id = ? AND user_id = ?").bind(bookId, userId).run();
  return result.meta.changes > 0;
}

export async function findStudyCard(db: D1Database, userId: string, bookId: string, reveal: boolean): Promise<Record<string, unknown> | null> {
  const row = await db
    .prepare(
      `SELECT c.*, latest.rating, latest.due_at, latest.interval_days, latest.ease_factor, latest.repetitions
       FROM cards c
       JOIN study_books b ON b.id = c.book_id AND b.user_id = ?
       LEFT JOIN reviews latest ON latest.id = (
         SELECT r.id FROM reviews r WHERE r.card_id = c.id ORDER BY r.reviewed_at DESC LIMIT 1
       )
       WHERE c.book_id = ? AND (latest.id IS NULL OR latest.due_at <= ?)
       ORDER BY CASE WHEN latest.id IS NULL THEN 0 ELSE 1 END, COALESCE(latest.due_at, c.created_at), c.created_at
       LIMIT 1`,
    )
    .bind(userId, bookId, new Date().toISOString())
    .first<Record<string, unknown>>();
  if (!row) return null;
  if (!reveal) {
    return {
      id: row.id,
      bookId: row.book_id,
      term: row.term,
      termAudioKey: row.term_audio_key,
      termAudioStatus: row.term_audio_status,
    };
  }
  return {
    id: row.id,
    bookId: row.book_id,
    term: row.term,
    translation: row.translation,
    sentence: row.sentence,
    sentenceSourceId: row.sentence_source_id,
    sentenceAuthor: row.sentence_author,
    sentenceSourceUrl: row.sentence_source_url,
    termAudioKey: row.term_audio_key,
    sentenceAudioKey: row.sentence_audio_key,
    termAudioStatus: row.term_audio_status,
    sentenceAudioStatus: row.sentence_audio_status,
  };
}

export async function saveReview(
  db: D1Database,
  userId: string,
  cardId: string,
  requestId: string,
  state: { rating: string; reviewedAt: string; dueAt: string; intervalDays: number; easeFactor: number; repetitions: number },
): Promise<{ id: string; duplicate: boolean } | null> {
  const existing = await db.prepare("SELECT id FROM reviews WHERE request_id = ? AND user_id = ?").bind(requestId, userId).first<{ id: string }>();
  if (existing) return { id: existing.id, duplicate: true };
  const id = crypto.randomUUID();
  const inserted = await db
    .prepare(
      `INSERT INTO reviews (id, card_id, user_id, rating, reviewed_at, due_at, interval_days, ease_factor, repetitions, request_id)
       SELECT ?, c.id, ?, ?, ?, ?, ?, ?, ?, ?
       FROM cards c JOIN study_books b ON b.id = c.book_id
       WHERE c.id = ? AND b.user_id = ?`,
    )
    .bind(id, userId, state.rating, state.reviewedAt, state.dueAt, state.intervalDays, state.easeFactor, state.repetitions, requestId, cardId, userId)
    .run();
  if (inserted.meta.changes === 0) return null;
  return { id, duplicate: false };
}

export async function latestReview(db: D1Database, userId: string, cardId: string): Promise<{ intervalDays: number; easeFactor: number; repetitions: number } | null> {
  const result = await db
    .prepare(
      `SELECT r.interval_days AS intervalDays, r.ease_factor AS easeFactor, r.repetitions
       FROM reviews r JOIN cards c ON c.id = r.card_id JOIN study_books b ON b.id = c.book_id
       WHERE r.card_id = ? AND b.user_id = ? ORDER BY r.reviewed_at DESC LIMIT 1`,
    )
    .bind(cardId, userId)
    .first<{ intervalDays: number; easeFactor: number; repetitions: number }>();
  return result ?? null;
}

export async function findSubscription(db: D1Database, userId: string): Promise<{ status: string; current_period_end: string | null } | null> {
  return db.prepare("SELECT status, current_period_end FROM subscriptions WHERE user_id = ?").bind(userId).first();
}
