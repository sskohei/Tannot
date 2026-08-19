import { describe, expect, it } from "vitest";
import { findLookupResults } from "@/server/lookup-data";

describe("static lookup data", () => {
  it("loads dictionary and example data from grouped static assets", async () => {
    const assets = {
      fetch: async (input: RequestInfo | URL) => {
        expect(String(input)).toContain("/data/lookup/r.json");
        return new Response(JSON.stringify({
          run: {
            translation: "走る",
            sentence: "I run every morning.",
            sourceId: "123",
            sourceUrl: "https://tatoeba.org/en/sentences/show/123",
          },
        }));
      },
    };

    await expect(findLookupResults(assets, "https://tannot.test/api/books", ["run"])).resolves.toEqual([{
      translation: "走る",
      sentence: "I run every morning.",
      sourceId: "123",
      author: null,
      sourceUrl: "https://tatoeba.org/en/sentences/show/123",
    }]);
  });

  it("keeps missing words as empty lookup results", async () => {
    const assets = { fetch: async () => new Response("{}") };
    await expect(findLookupResults(assets, "https://tannot.test/api/books", ["unknown"])).resolves.toEqual([{
      translation: null,
      sentence: null,
      sourceId: null,
      author: null,
      sourceUrl: null,
    }]);
  });
});
