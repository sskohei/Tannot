import type { Card, DictionaryResult, StudyBook, StudyBookSummary } from "@/lib/types";
import { getReviewIntervals, type StoredReviewState } from "@/lib/review";

type CardInput = {
  term: string;
  normalizedTerm: string;
  result: DictionaryResult;
};

type User = { id: string; email: string; name: string };

export type Subscription = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: number;
  last_event_created_at: number;
};

export type PendingCheckoutSession = {
  user_id: string;
  request_token: string;
  stripe_session_id: string | null;
  checkout_url: string | null;
  expires_at: string;
};

export async function ensureUser(db: D1Database, user: User): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, email, name) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name`,
    )
    .bind(user.id, user.email, user.name)
    .run();
}

export async function recordPolicyAcceptance(
  db: D1Database,
  userId: string,
  input: { termsVersion: string; privacyVersion: string; confirmEligibility: boolean },
): Promise<void> {
  const acceptedAt = new Date().toISOString();
  await db.prepare(
    `UPDATE users
     SET terms_accepted_at = ?, privacy_accepted_at = ?, terms_version = ?, privacy_version = ?,
         eligibility_confirmed_at = CASE WHEN ? THEN ? ELSE eligibility_confirmed_at END
     WHERE id = ?`,
  ).bind(
    acceptedAt,
    acceptedAt,
    input.termsVersion,
    input.privacyVersion,
    input.confirmEligibility ? 1 : 0,
    acceptedAt,
    userId,
  ).run();
}

export type PolicyAcceptance = {
  terms_version: string | null;
  privacy_version: string | null;
  eligibility_confirmed_at: string | null;
};

export async function findPolicyAcceptance(db: D1Database, userId: string): Promise<PolicyAcceptance | null> {
  return db.prepare(
    "SELECT terms_version, privacy_version, eligibility_confirmed_at FROM users WHERE id = ?",
  ).bind(userId).first<PolicyAcceptance>();
}

export async function countUserBooks(db: D1Database, userId: string): Promise<number> {
  const result = await db.prepare("SELECT COUNT(*) AS count FROM study_books WHERE user_id = ?").bind(userId).first<{ count: number }>();
  return Number(result?.count ?? 0);
}

export async function createBook(
  db: D1Database,
  userId: string,
  title: string,
  cards: CardInput[],
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
            error_code, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          error ? "LOOKUP_INCOMPLETE" : null,
          error ? "辞書または例文が見つかりませんでした" : null,
        );
    }),
  ];
  await db.batch(statements);
  return { id: bookId, user_id: userId, title, created_at: now, updated_at: now };
}

export async function addCards(
  db: D1Database,
  userId: string,
  bookId: string,
  cards: CardInput[],
): Promise<{ book: StudyBook; addedCards: Card[]; skippedTerms: string[] } | null> {
  const book = await db.prepare("SELECT * FROM study_books WHERE id = ? AND user_id = ?").bind(bookId, userId).first<StudyBook>();
  if (!book) return null;

  const existing = await db.prepare("SELECT normalized_term FROM cards WHERE book_id = ?").bind(bookId).all<{ normalized_term: string }>();
  const existingTerms = new Set(existing.results.map((card) => card.normalized_term));
  const newCards = cards.filter((card) => !existingTerms.has(card.normalizedTerm));
  const skippedTerms = cards.filter((card) => existingTerms.has(card.normalizedTerm)).map((card) => card.term);
  const now = new Date().toISOString();
  const addedCards = newCards.map((card) => ({
    id: crypto.randomUUID(),
    book_id: bookId,
    term: card.term,
    normalized_term: card.normalizedTerm,
    translation: card.result.translation,
    sentence: card.result.sentence,
    sentence_source_id: card.result.sourceId,
    sentence_author: card.result.author,
    sentence_source_url: card.result.sourceUrl,
    error_code: !card.result.translation || !card.result.sentence ? "LOOKUP_INCOMPLETE" : null,
    error_message: !card.result.translation || !card.result.sentence ? "辞書または例文が見つかりませんでした" : null,
    created_at: now,
  } satisfies Card));

  if (addedCards.length > 0) {
    await db.batch(addedCards.map((card) => db.prepare(
      `INSERT INTO cards (
        id, book_id, term, normalized_term, translation, sentence,
        sentence_source_id, sentence_author, sentence_source_url,
        error_code, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      card.id,
      card.book_id,
      card.term,
      card.normalized_term,
      card.translation,
      card.sentence,
      card.sentence_source_id,
      card.sentence_author,
      card.sentence_source_url,
      card.error_code,
      card.error_message,
      card.created_at,
    )));
    await db.prepare("UPDATE study_books SET updated_at = ? WHERE id = ? AND user_id = ?").bind(now, bookId, userId).run();
  }

  return {
    book: { ...book, updated_at: addedCards.length > 0 ? now : book.updated_at },
    addedCards,
    skippedTerms,
  };
}

export async function listBooks(db: D1Database, userId: string): Promise<StudyBookSummary[]> {
  const now = new Date().toISOString();
  const result = await db.prepare(
    `SELECT b.*,
            (SELECT COUNT(*) FROM cards c WHERE c.book_id = b.id) AS card_count,
            (SELECT COUNT(*)
             FROM cards c
             WHERE c.book_id = b.id
               AND (
                 NOT EXISTS (SELECT 1 FROM reviews r WHERE r.card_id = c.id)
                 OR (SELECT r.due_at FROM reviews r WHERE r.card_id = c.id ORDER BY r.reviewed_at DESC LIMIT 1) <= ?
               )) AS due_count
     FROM study_books b
     WHERE b.user_id = ?
     ORDER BY b.updated_at DESC`,
  ).bind(now, userId).all<StudyBookSummary>();
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

export async function updateBookTitle(db: D1Database, userId: string, bookId: string, title: string): Promise<StudyBook | null> {
  const now = new Date().toISOString();
  const updated = await db.prepare(
    "UPDATE study_books SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  ).bind(title, now, bookId, userId).run();
  if (updated.meta.changes === 0) return null;
  return db.prepare("SELECT * FROM study_books WHERE id = ? AND user_id = ?").bind(bookId, userId).first<StudyBook>();
}

export async function updateCard(
  db: D1Database,
  userId: string,
  bookId: string,
  cardId: string,
  input: { term: string; normalizedTerm: string; translation: string | null; sentence: string | null },
): Promise<{ card: Card | null; duplicate: boolean }> {
  const ownedCard = await db.prepare(
    `SELECT c.id FROM cards c
     JOIN study_books b ON b.id = c.book_id
     WHERE c.id = ? AND c.book_id = ? AND b.user_id = ?`,
  ).bind(cardId, bookId, userId).first<{ id: string }>();
  if (!ownedCard) return { card: null, duplicate: false };

  const duplicate = await db.prepare(
    "SELECT id FROM cards WHERE book_id = ? AND normalized_term = ? AND id <> ?",
  ).bind(bookId, input.normalizedTerm, cardId).first<{ id: string }>();
  if (duplicate) return { card: null, duplicate: true };

  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      `UPDATE cards
       SET term = ?, normalized_term = ?, translation = ?, sentence = ?,
           sentence_source_id = NULL, sentence_author = NULL, sentence_source_url = NULL,
           error_code = NULL, error_message = NULL
       WHERE id = ? AND book_id = ?`,
    ).bind(input.term, input.normalizedTerm, input.translation, input.sentence, cardId, bookId),
    db.prepare("UPDATE study_books SET updated_at = ? WHERE id = ? AND user_id = ?").bind(now, bookId, userId),
  ]);
  return {
    card: await db.prepare("SELECT * FROM cards WHERE id = ? AND book_id = ?").bind(cardId, bookId).first<Card>(),
    duplicate: false,
  };
}

export async function deleteCard(db: D1Database, userId: string, bookId: string, cardId: string): Promise<boolean> {
  const deleted = await db.prepare(
    `DELETE FROM cards
     WHERE id = ? AND book_id = ?
       AND EXISTS (SELECT 1 FROM study_books b WHERE b.id = cards.book_id AND b.user_id = ?)`,
  ).bind(cardId, bookId, userId).run();
  if (deleted.meta.changes === 0) return false;
  await db.prepare("UPDATE study_books SET updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(new Date().toISOString(), bookId, userId)
    .run();
  return true;
}

export async function findStudyCard(db: D1Database, userId: string, bookId: string, reveal: boolean): Promise<Record<string, unknown> | null> {
  const select = `SELECT c.*, latest.rating, latest.due_at, latest.interval_days, latest.ease_factor, latest.repetitions,
      latest.fsrs_state, latest.fsrs_stability, latest.fsrs_difficulty, latest.fsrs_elapsed_days,
      latest.fsrs_learning_steps, latest.fsrs_lapses, latest.reviewed_at
    FROM cards c
    JOIN study_books b ON b.id = c.book_id AND b.user_id = ?
    LEFT JOIN reviews latest ON latest.id = (
      SELECT r.id FROM reviews r WHERE r.card_id = c.id ORDER BY r.reviewed_at DESC LIMIT 1
    )`;
  const queryNow = new Date().toISOString();
  let row = await db
    .prepare(`${select}
       WHERE c.book_id = ? AND (latest.id IS NULL OR latest.due_at <= ?)
       ORDER BY CASE WHEN latest.id IS NULL THEN 0 ELSE 1 END, COALESCE(latest.due_at, c.created_at), c.created_at
       LIMIT 1`)
    .bind(userId, bookId, queryNow)
    .first<Record<string, unknown>>();

  if (!row) {
    const remaining = await db
      .prepare(`${select}
         WHERE c.book_id = ? AND latest.id IS NOT NULL
         ORDER BY latest.due_at, c.created_at`)
      .bind(userId, bookId)
      .all<Record<string, unknown>>();
    // If every remaining card is a minute-based retry, let the user continue
    // without waiting for the retry timer. Day-based reviews still wait.
    if (remaining.results.length > 0 && remaining.results.every((card) => Number(card.interval_days) === 0)) {
      row = remaining.results[0];
    }
  }
  if (!row) return null;
  if (!reveal) {
    return {
      id: row.id,
      bookId: row.book_id,
      term: row.term,
    };
  }
  const now = new Date();
  const previous = toStoredReviewState(row);
  const reviewIntervals = getReviewIntervals(previous, now);
  return {
    id: row.id,
    bookId: row.book_id,
    term: row.term,
    translation: row.translation,
    sentence: row.sentence,
    sentenceSourceId: row.sentence_source_id,
    sentenceAuthor: row.sentence_author,
    sentenceSourceUrl: row.sentence_source_url,
    reviewIntervals,
  };
}

export async function saveReview(
  db: D1Database,
  userId: string,
  cardId: string,
  requestId: string,
  state: ReviewSaveState,
): Promise<{ id: string; duplicate: boolean } | null> {
  const existing = await db.prepare("SELECT id FROM reviews WHERE request_id = ? AND user_id = ?").bind(requestId, userId).first<{ id: string }>();
  if (existing) return { id: existing.id, duplicate: true };
  const id = crypto.randomUUID();
  const inserted = await db
    .prepare(
      `INSERT INTO reviews (
         id, card_id, user_id, rating, reviewed_at, due_at, interval_days, ease_factor, repetitions,
         request_id, fsrs_state, fsrs_stability, fsrs_difficulty, fsrs_elapsed_days, fsrs_learning_steps, fsrs_lapses
       )
       SELECT ?, c.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       FROM cards c JOIN study_books b ON b.id = c.book_id
       WHERE c.id = ? AND b.user_id = ?`,
    )
    .bind(
      id, userId, state.rating, state.reviewedAt, state.dueAt, state.intervalDays, 2.5, state.repetitions,
      requestId, state.state, state.stability, state.difficulty, state.elapsedDays, state.learningSteps, state.lapses,
      cardId, userId,
    )
    .run();
  if (inserted.meta.changes === 0) return null;
  return { id, duplicate: false };
}

export async function latestReview(db: D1Database, userId: string, cardId: string): Promise<StoredReviewState | null> {
  const result = await db
    .prepare(
      `SELECT r.due_at AS dueAt, r.interval_days AS intervalDays, r.fsrs_state AS state,
              r.fsrs_stability AS stability, r.fsrs_difficulty AS difficulty,
              r.fsrs_elapsed_days AS elapsedDays, r.fsrs_learning_steps AS learningSteps,
              r.fsrs_lapses AS lapses, r.repetitions, r.reviewed_at AS reviewedAt
       FROM reviews r JOIN cards c ON c.id = r.card_id JOIN study_books b ON b.id = c.book_id
       WHERE r.card_id = ? AND b.user_id = ? AND r.fsrs_state IS NOT NULL
       ORDER BY r.reviewed_at DESC LIMIT 1`,
    )
    .bind(cardId, userId)
    .first<Record<string, unknown>>();
  if (!result) return null;
  return {
    dueAt: new Date(String(result.dueAt)),
    intervalDays: Number(result.intervalDays),
    state: Number(result.state),
    stability: Number(result.stability),
    difficulty: Number(result.difficulty),
    elapsedDays: Number(result.elapsedDays),
    learningSteps: Number(result.learningSteps),
    lapses: Number(result.lapses),
    repetitions: Number(result.repetitions),
    reviewedAt: new Date(String(result.reviewedAt)),
  };
}

type ReviewSaveState = {
  rating: string;
  reviewedAt: string;
  dueAt: string;
  intervalDays: number;
  state: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  learningSteps: number;
  lapses: number;
  repetitions: number;
};

function toStoredReviewState(row: Record<string, unknown>): StoredReviewState | null {
  if (row.fsrs_state === null || row.fsrs_state === undefined) return null;
  return {
    dueAt: new Date(String(row.due_at)),
    intervalDays: Number(row.interval_days),
    state: Number(row.fsrs_state),
    stability: Number(row.fsrs_stability),
    difficulty: Number(row.fsrs_difficulty),
    elapsedDays: Number(row.fsrs_elapsed_days),
    learningSteps: Number(row.fsrs_learning_steps),
    lapses: Number(row.fsrs_lapses),
    repetitions: Number(row.repetitions),
    reviewedAt: new Date(String(row.reviewed_at)),
  };
}

export async function findSubscription(db: D1Database, userId: string): Promise<Subscription | null> {
  return db.prepare(
    `SELECT user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end,
            cancel_at_period_end, last_event_created_at
     FROM subscriptions WHERE user_id = ?`,
  ).bind(userId).first<Subscription>();
}

export async function saveSubscription(
  db: D1Database,
  subscription: Omit<Subscription, "user_id"> & { userId: string },
): Promise<void> {
  await db.prepare(
    `INSERT INTO subscriptions (
       user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end,
       cancel_at_period_end, last_event_created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       last_event_created_at = excluded.last_event_created_at
     WHERE excluded.last_event_created_at >= subscriptions.last_event_created_at`,
  ).bind(
    subscription.userId,
    subscription.stripe_customer_id,
    subscription.stripe_subscription_id,
    subscription.status,
    subscription.current_period_end,
    subscription.cancel_at_period_end,
    subscription.last_event_created_at,
  ).run();
}

export async function hasProcessedStripeEvent(db: D1Database, eventId: string): Promise<boolean> {
  const event = await db.prepare("SELECT event_id FROM stripe_events WHERE event_id = ?").bind(eventId).first<{ event_id: string }>();
  return event !== null;
}

export async function recordProcessedStripeEvent(db: D1Database, eventId: string): Promise<void> {
  await db.prepare("INSERT OR IGNORE INTO stripe_events (event_id) VALUES (?)").bind(eventId).run();
}

export async function findPendingCheckoutSession(
  db: D1Database,
  userId: string,
  now: string,
): Promise<PendingCheckoutSession | null> {
  return db.prepare(
    `SELECT user_id, request_token, stripe_session_id, checkout_url, expires_at
     FROM billing_checkout_sessions WHERE user_id = ? AND expires_at > ?`,
  ).bind(userId, now).first<PendingCheckoutSession>();
}

export async function claimPendingCheckoutSession(
  db: D1Database,
  input: { userId: string; requestToken: string; expiresAt: string; now: string },
): Promise<boolean> {
  const result = await db.prepare(
    `INSERT INTO billing_checkout_sessions (user_id, request_token, expires_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       request_token = excluded.request_token,
       stripe_session_id = NULL,
       checkout_url = NULL,
       expires_at = excluded.expires_at,
       created_at = datetime('now')
     WHERE billing_checkout_sessions.expires_at <= ?`,
  ).bind(input.userId, input.requestToken, input.expiresAt, input.now).run();
  return result.meta.changes > 0;
}

export async function savePendingCheckoutSession(
  db: D1Database,
  input: { userId: string; requestToken: string; sessionId: string; checkoutUrl: string; expiresAt: string },
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE billing_checkout_sessions
     SET stripe_session_id = ?, checkout_url = ?, expires_at = ?
     WHERE user_id = ? AND request_token = ?`,
  ).bind(input.sessionId, input.checkoutUrl, input.expiresAt, input.userId, input.requestToken).run();
  return result.meta.changes > 0;
}

export async function releasePendingCheckoutSession(
  db: D1Database,
  userId: string,
  requestToken: string,
): Promise<void> {
  await db.prepare(
    "DELETE FROM billing_checkout_sessions WHERE user_id = ? AND request_token = ? AND stripe_session_id IS NULL",
  ).bind(userId, requestToken).run();
}

export async function deletePendingCheckoutSessionByStripeId(db: D1Database, stripeSessionId: string): Promise<void> {
  await db.prepare("DELETE FROM billing_checkout_sessions WHERE stripe_session_id = ?").bind(stripeSessionId).run();
}

export async function exportUserData(db: D1Database, userId: string): Promise<Record<string, unknown>> {
  const [books, cards, reviews] = await Promise.all([
    db.prepare("SELECT id, title, created_at, updated_at FROM study_books WHERE user_id = ? ORDER BY created_at").bind(userId).all<Record<string, unknown>>(),
    db.prepare(
      `SELECT c.id, c.book_id, c.term, c.translation, c.sentence, c.sentence_source_id,
              c.sentence_author, c.sentence_source_url, c.created_at
       FROM cards c JOIN study_books b ON b.id = c.book_id
       WHERE b.user_id = ? ORDER BY c.created_at`,
    ).bind(userId).all<Record<string, unknown>>(),
    db.prepare(
      `SELECT r.card_id, r.rating, r.reviewed_at, r.due_at, r.interval_days, r.repetitions
       FROM reviews r WHERE r.user_id = ? ORDER BY r.reviewed_at`,
    ).bind(userId).all<Record<string, unknown>>(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    books: books.results,
    cards: cards.results,
    reviews: reviews.results,
  };
}

export async function deleteUserData(db: D1Database, userId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM reviews WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM study_books WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM subscriptions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM billing_checkout_sessions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM session WHERE userId = ?").bind(userId),
    db.prepare("DELETE FROM account WHERE userId = ?").bind(userId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
    db.prepare("DELETE FROM user WHERE id = ?").bind(userId),
  ]);
}
