import type { Rating, ReviewState } from "./types";

const MIN_EASE = 1.3;
const MAX_INTERVAL_DAYS = 365;

export function calculateReview(
  rating: Rating,
  previous: Pick<ReviewState, "intervalDays" | "easeFactor" | "repetitions">,
  now = new Date(),
): ReviewState {
  const easeFactor = Math.max(
    MIN_EASE,
    previous.easeFactor + (rating === "easy" ? 0.15 : rating === "hard" ? -0.15 : rating === "again" ? -0.2 : 0),
  );

  let intervalDays: number;
  let repetitions: number;
  switch (rating) {
    case "again":
      intervalDays = 0;
      repetitions = 0;
      break;
    case "hard":
      intervalDays = Math.max(1, Math.round(Math.max(1, previous.intervalDays) * 1.2));
      repetitions = previous.repetitions + 1;
      break;
    case "good":
      intervalDays = previous.repetitions === 0
        ? 1
        : Math.max(1, Math.round(Math.max(1, previous.intervalDays) * easeFactor));
      repetitions = previous.repetitions + 1;
      break;
    case "easy":
      intervalDays = previous.repetitions === 0
        ? 4
        : Math.max(2, Math.round(Math.max(1, previous.intervalDays) * easeFactor * 1.3));
      repetitions = previous.repetitions + 1;
      break;
  }

  intervalDays = Math.min(MAX_INTERVAL_DAYS, intervalDays);
  const dueAt = new Date(now);
  if (intervalDays === 0) dueAt.setMinutes(dueAt.getMinutes() + 10);
  else dueAt.setUTCDate(dueAt.getUTCDate() + intervalDays);

  return { rating, intervalDays, easeFactor, repetitions, dueAt };
}
