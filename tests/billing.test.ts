import { describe, expect, it } from "vitest";
import { isPremiumStatus, isWithinFreeCardLimit } from "@/lib/billing";

describe("billing limits", () => {
  it("treats active and trialing subscriptions as premium", () => {
    expect(isPremiumStatus("active")).toBe(true);
    expect(isPremiumStatus("trialing")).toBe(true);
    expect(isPremiumStatus("past_due")).toBe(false);
    expect(isPremiumStatus("canceled")).toBe(false);
  });

  it("enforces the free card limit including new cards", () => {
    expect(isWithinFreeCardLimit(0, 100, 100)).toBe(true);
    expect(isWithinFreeCardLimit(0, 101, 100)).toBe(false);
    expect(isWithinFreeCardLimit(99, 1, 100)).toBe(true);
    expect(isWithinFreeCardLimit(100, 1, 100)).toBe(false);
  });
});
