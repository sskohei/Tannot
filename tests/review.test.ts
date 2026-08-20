import { describe, expect, it } from "vitest";
import { calculateReview, getReviewIntervals } from "@/lib/review";

describe("FSRS review schedule", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("previews FSRS intervals for a new card", () => {
    expect(getReviewIntervals(null, now)).toEqual({
      again: { intervalDays: 0, intervalMinutes: 10 },
      hard: { intervalDays: 0, intervalMinutes: 15 },
      good: { intervalDays: 2, intervalMinutes: null },
      easy: { intervalDays: 8, intervalMinutes: null },
    });
  });

  it("stores FSRS memory state and advances a graduated card", () => {
    const first = calculateReview("good", null, now);
    expect(first.state).toBe(2);
    expect(first.intervalDays).toBe(2);
    expect(first.repetitions).toBe(1);
    expect(first.stability).toBeGreaterThan(0);
    expect(first.difficulty).toBeGreaterThan(0);

    const next = calculateReview("good", first, new Date("2026-01-03T00:00:00.000Z"));
    expect(next.state).toBe(2);
    expect(next.intervalDays).toBe(11);
    expect(next.repetitions).toBe(2);
    expect(next.dueAt.toISOString()).toBe("2026-01-14T00:00:00.000Z");
  });

  it("moves a forgotten review card to relearning", () => {
    const first = calculateReview("good", null, now);
    const forgotten = calculateReview("again", first, new Date("2026-01-03T00:00:00.000Z"));

    expect(forgotten.state).toBe(3);
    expect(forgotten.intervalDays).toBe(0);
    expect(forgotten.lapses).toBe(1);
    expect(forgotten.dueAt.toISOString()).toBe("2026-01-03T00:10:00.000Z");
  });
});
