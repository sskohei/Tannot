const MAX_TERM_LENGTH = 100;
const MAX_TITLE_LENGTH = 100;
const MAX_INPUT_LENGTH = 10_000;
const MAX_TERMS = 100;

export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
}

export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function parseTerms(input: unknown): string[] {
  if (typeof input !== "string" || input.length > MAX_INPUT_LENGTH) {
    throw new ValidationError("単語リストを確認してください");
  }

  const terms = input
    .split(/[\n,]/u)
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => {
      if (term.length > MAX_TERM_LENGTH) {
        throw new ValidationError("単語または熟語が長すぎます");
      }
      return term;
    });

  const unique = [...terms.reduce((result, term) => {
    const key = normalizeTerm(term);
    if (!result.has(key)) result.set(key, term);
    return result;
  }, new Map<string, string>()).values()];
  if (unique.length === 0 || unique.length > MAX_TERMS) {
    throw new ValidationError(`単語は1〜${MAX_TERMS}件で入力してください`);
  }
  return unique;
}

export function parseTitle(title: unknown): string {
  if (typeof title !== "string") throw new ValidationError("単語帳名を入力してください");
  const value = title.trim();
  if (value.length === 0 || value.length > MAX_TITLE_LENGTH) {
    throw new ValidationError("単語帳名は1〜100文字で入力してください");
  }
  return value;
}

export function parseRating(value: unknown): "again" | "hard" | "good" | "easy" {
  if (value === "again" || value === "hard" || value === "good" || value === "easy") return value;
  throw new ValidationError("評価を確認してください");
}

export function parseRequestId(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 100) {
    throw new ValidationError("requestIdを確認してください");
  }
  return value;
}
