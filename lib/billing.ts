const premiumStatuses = new Set(["active", "trialing"]);

export function isPremiumStatus(status: string | null | undefined): boolean {
  return Boolean(status && premiumStatuses.has(status));
}

export function isWithinFreeCardLimit(existingCardCount: number, newCardCount: number, limit: number): boolean {
  return existingCardCount + newCardCount <= limit;
}
