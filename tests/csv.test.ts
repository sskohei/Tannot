import { describe, expect, it } from "vitest";
import { createCardsCsv, parseImportedBooksCsv } from "@/server/csv";

describe("CSV import and export", () => {
  it("groups cards by book and accepts quoted fields", () => {
    const books = parseImportedBooksCsv('book_title,term,translation,sentence,tags\nTOEIC,run,走る,"I run, every day.",動詞|基礎\nTOEIC,make progress,進歩する,,熟語');
    expect(books).toEqual([{ title: "TOEIC", cards: [
      { term: "run", translation: "走る", sentence: "I run, every day.", tags: ["動詞", "基礎"] },
      { term: "make progress", translation: "進歩する", sentence: null, tags: ["熟語"] },
    ] }]);
  });

  it("escapes values that spreadsheet programs could treat as formulas", () => {
    const csv = createCardsCsv([{ book_title: "=formula", term: "+term", translation: null, sentence: "line\nbreak", tags: "" }]);
    expect(csv).toContain("'=formula,'+term");
    expect(csv).toContain('"line\nbreak"');
  });
});
