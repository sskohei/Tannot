import {
  createEmptyCard,
  fsrs,
  Rating as FsrsRating,
  State as FsrsState,
  type Card as FsrsCard,
} from "ts-fsrs";
import type { Rating, ReviewState } from "./types";

const ratings = ["again", "hard", "good", "easy"] as const;
const scheduler = fsrs({
  // Keep the current product's one-year cap while using FSRS scheduling.
  maximum_interval: 365,
  // A higher target retention keeps consecutive "easy" reviews from
  // jumping too far apart while still letting FSRS adapt per card.
  request_retention: 0.95,
  // Fuzz is useful in production, but deterministic previews and tests are more
  // useful until the app has its own scheduling history and settings UI.
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ["10m"],
  relearning_steps: ["10m"],
});

const fsrsRatings = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
} as const;

export type StoredReviewState = Omit<ReviewState, "rating" | "reviewedAt"> & {
  reviewedAt: Date;
};

export type ReviewInterval = {
  intervalDays: number;
  intervalMinutes: number | null;
};

export function createReviewCard(previous: StoredReviewState | null, now: Date): FsrsCard {
  if (!previous) return createEmptyCard(now);

  return {
    due: previous.dueAt,
    stability: previous.stability,
    difficulty: previous.difficulty,
    elapsed_days: previous.elapsedDays,
    scheduled_days: previous.intervalDays,
    reps: previous.repetitions,
    lapses: previous.lapses,
    learning_steps: previous.learningSteps,
    state: previous.state as FsrsState,
    last_review: previous.reviewedAt,
  };
}

function toReviewState(rating: Rating, card: FsrsCard, now: Date): ReviewState {
  return {
    rating,
    state: card.state,
    intervalDays: card.scheduled_days,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    learningSteps: card.learning_steps,
    lapses: card.lapses,
    repetitions: card.reps,
    dueAt: card.due,
    reviewedAt: now,
  };
}

export function calculateReview(
  rating: Rating,
  previous: StoredReviewState | null,
  now = new Date(),
): ReviewState {
  const result = scheduler.next(createReviewCard(previous, now), now, fsrsRatings[rating]);
  return toReviewState(rating, result.card, now);
}

export function getReviewIntervals(
  previous: StoredReviewState | null,
  now = new Date(),
): Record<Rating, ReviewInterval> {
  return Object.fromEntries(ratings.map((rating) => {
    const state = calculateReview(rating, previous, now);
    return [rating, {
      intervalDays: state.intervalDays,
      intervalMinutes: state.intervalDays === 0 ? Math.max(1, Math.round((state.dueAt.getTime() - now.getTime()) / 60_000)) : null,
    }];
  })) as Record<Rating, ReviewInterval>;
}
