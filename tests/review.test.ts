import { describe, expect, it } from "vitest";
import { calculateReview, getReviewIntervals } from "@/lib/review";

describe("review schedule", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("uses a short retry for again and increases repetitions for good", () => {
    const again = calculateReview("again", { intervalDays: 10, easeFactor: 2.5, repetitions: 3 }, now);
    expect(again.intervalDays).toBe(0);
    expect(again.dueAt.toISOString()).toBe("2026-01-01T00:10:00.000Z");

    const good = calculateReview("good", { intervalDays: 1, easeFactor: 2.5, repetitions: 1 }, now);
    expect(good.intervalDays).toBe(3);
    expect(good.repetitions).toBe(2);
  });

  it("keeps the ease factor above the safety minimum", () => {
    const result = calculateReview("hard", { intervalDays: 1, easeFactor: 1.3, repetitions: 1 }, now);
    expect(result.easeFactor).toBe(1.3);
  });

  it("returns the next interval for every rating", () => {
    const intervals = getReviewIntervals({ intervalDays: 0, easeFactor: 2.5, repetitions: 0 }, now);

    expect(intervals.again).toEqual({ intervalDays: 0, intervalMinutes: 10 });
    expect(intervals.hard).toEqual({ intervalDays: 1, intervalMinutes: null });
    expect(intervals.good).toEqual({ intervalDays: 1, intervalMinutes: null });
    expect(intervals.easy).toEqual({ intervalDays: 4, intervalMinutes: null });
  });
});
