import type { DictionaryResult } from "@/lib/types";

type LookupEntry = {
  translation: string | null;
  sentence: string | null;
  sourceId: string | null;
  sourceUrl: string | null;
};

type LookupShard = Record<string, LookupEntry>;
type AssetFetcher = Pick<Fetcher, "fetch">;

const shardCache = new Map<string, Promise<LookupShard>>();

function shardForTerm(term: string): string {
  const first = term[0] ?? "_";
  return /^[a-z]$/u.test(first) ? first : "_";
}

async function loadShard(assets: AssetFetcher | undefined, baseUrl: string, shard: string): Promise<LookupShard> {
  const url = new URL(`/data/lookup/${shard}.json`, baseUrl).toString();
  const cacheKey = `${url}|${assets ? "assets" : "fetch"}`;
  const cached = shardCache.get(cacheKey);
  if (cached) return cached;

  const request = (assets ? assets.fetch(url) : fetch(url))
    .then(async (response) => {
      if (!response.ok) return {};
      return await response.json() as LookupShard;
    })
    .catch(() => ({}));
  shardCache.set(cacheKey, request);
  return request;
}

export async function findLookupResults(
  assets: AssetFetcher | undefined,
  baseUrl: string,
  normalizedTerms: string[],
): Promise<DictionaryResult[]> {
  const shards = [...new Set(normalizedTerms.map(shardForTerm))];
  const loaded = await Promise.all(shards.map(async (shard) => [shard, await loadShard(assets, baseUrl, shard)] as const));
  const lookup = new Map(loaded);

  return normalizedTerms.map((term) => {
    const entry = lookup.get(shardForTerm(term))?.[term];
    return {
      translation: entry?.translation ?? null,
      sentence: entry?.sentence ?? null,
      sourceId: entry?.sourceId ?? null,
      author: null,
      sourceUrl: entry?.sourceUrl ?? null,
    };
  });
}
