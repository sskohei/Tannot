import { describe, expect, it } from "vitest";
import { calculateReview } from "@/lib/review";

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
});
