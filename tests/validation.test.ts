import { describe, expect, it } from "vitest";
import { normalizeTerm, parseTerms, parseTitle, ValidationError } from "@/lib/validation";

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
});
