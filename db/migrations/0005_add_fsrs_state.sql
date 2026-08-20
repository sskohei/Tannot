PRAGMA foreign_keys = ON;

-- FSRS memory state is stored on each review event so the review log remains
-- append-only and cards can be reconstructed without mutating old reviews.
-- Existing reviews have NULL FSRS state and are treated as new by the FSRS
-- scheduler on their next review; their historical records remain intact.
ALTER TABLE reviews ADD COLUMN fsrs_state INTEGER;
ALTER TABLE reviews ADD COLUMN fsrs_stability REAL;
ALTER TABLE reviews ADD COLUMN fsrs_difficulty REAL;
ALTER TABLE reviews ADD COLUMN fsrs_elapsed_days INTEGER;
ALTER TABLE reviews ADD COLUMN fsrs_learning_steps INTEGER;
ALTER TABLE reviews ADD COLUMN fsrs_lapses INTEGER;

CREATE INDEX IF NOT EXISTS reviews_card_reviewed_idx ON reviews(card_id, reviewed_at DESC);
