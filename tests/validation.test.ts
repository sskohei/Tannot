import { describe, expect, it } from "vitest";
import { normalizeTerm, parseCardCopy, parseCardTerm, parseTerms, parseTitle, ValidationError } from "@/lib/validation";

describe("input validation", () => {
  it("normalizes whitespace and removes duplicate terms", () => {
    expect(normalizeTerm("  Look   Forward To ")).toBe("look forward to");
    expect(parseTerms("run, RUN\n\ngive up")).toEqual(["run", "give up"]);
  });

  it("rejects an empty or oversized list", () => {
    expect(() => parseTerms(" ")).toThrow(ValidationError);
    expect(() => parseTerms(Array.from({ length: 101 }, (_, i) => `term-${i}`).join("\n"))).toThrow(ValidationError);
  });

  it("validates book titles", () => {
    expect(parseTitle("  Travel English ")).toBe("Travel English");
    expect(() => parseTitle("")).toThrow(ValidationError);
  });

  it("validates editable card fields", () => {
    expect(parseCardTerm("  look   forward to ")).toBe("look forward to");
    expect(parseCardCopy("  〜を楽しみにする  ", "日本語訳")).toBe("〜を楽しみにする");
    expect(parseCardCopy("", "例文")).toBeNull();
    expect(() => parseCardTerm(" ")).toThrow(ValidationError);
    expect(() => parseCardCopy("x".repeat(2001), "例文")).toThrow(ValidationError);
  });
});
