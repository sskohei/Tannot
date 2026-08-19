import { describe, expect, it } from "vitest";
import { addCards } from "@/server/db";

const book = {
  id: "book-1",
  user_id: "user-1",
  title: "旅行英語",
  created_at: "2026-08-20T00:00:00.000Z",
  updated_at: "2026-08-20T00:00:00.000Z",
};

function createDb({ ownsBook = true } = {}) {
  const statements: string[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(..._values: unknown[]) {
          return {
            first: async <T>() => (sql.startsWith("SELECT * FROM study_books") && ownsBook ? book as T : null),
            all: async <T>() => (sql.startsWith("SELECT normalized_term") ? { results: [{ normalized_term: "run" }] as T[] } : { results: [] as T[] }),
            run: async () => { statements.push(sql); return { meta: { changes: 1 } }; },
          };
        },
      };
    },
    batch(batchStatements: unknown[]) {
      statements.push(...batchStatements.map(() => "INSERT INTO cards"));
      return Promise.resolve({});
    },
  } as unknown as D1Database;
  return { db, statements };
}

describe("study book cards", () => {
  it("adds new cards and skips terms already in the book", async () => {
    const { db, statements } = createDb();
    const result = await addCards(db, "user-1", "book-1", [
      { term: "run", normalizedTerm: "run", result: { translation: "走る", sentence: "I run.", sourceId: null, author: null, sourceUrl: null } },
      { term: "walk", normalizedTerm: "walk", result: { translation: "歩く", sentence: "I walk.", sourceId: null, author: null, sourceUrl: null } },
    ]);

    expect(result?.addedCards.map((card) => card.term)).toEqual(["walk"]);
    expect(result?.skippedTerms).toEqual(["run"]);
    expect(statements).toHaveLength(2);
  });

  it("does not add cards to another user's book", async () => {
    const { db, statements } = createDb({ ownsBook: false });
    await expect(addCards(db, "user-2", "book-1", [])).resolves.toBeNull();
    expect(statements).toHaveLength(0);
  });
});
