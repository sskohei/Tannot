import { mkdir, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

type Row = {
  word: string;
  translation: string | null;
  sentence: string | null;
  sentence_id: number | null;
};

const input = process.argv[2];
const output = process.argv[3] ?? "public/data/lookup";
const sourceVersion = process.argv[4] ?? "unspecified";
if (!input) throw new Error("Usage: tsx scripts/build-lookup-assets.ts path/to/ejcsv.db [output-dir] [source-version]");

const db = new DatabaseSync(input, { readOnly: true });
const shards = new Map<string, Record<string, Row>>();
const shardForWord = (word: string) => /^[a-z]$/u.test(word[0] ?? "") ? word[0] : "_";

const rows = db.prepare(`
  SELECT d.word, d.translation, s.text AS sentence, s.id AS sentence_id
  FROM dictionary d
  LEFT JOIN word_examples we ON we.word = d.word
  LEFT JOIN sentences s ON s.id = we.sentence_id
  UNION ALL
  SELECT we.word, NULL, s.text, s.id
  FROM word_examples we
  JOIN sentences s ON s.id = we.sentence_id
  WHERE NOT EXISTS (SELECT 1 FROM dictionary d WHERE d.word = we.word)
  ORDER BY word
`).all() as unknown as Row[];

for (const row of rows) {
  const shard = shardForWord(row.word);
  const values = shards.get(shard) ?? {};
  values[row.word] = row;
  shards.set(shard, values);
}

await mkdir(output, { recursive: true });
for (const [shard, values] of shards) {
const data = Object.fromEntries(Object.entries(values).map(([word, row]) => [word, {
    translation: row.translation,
    sentence: row.sentence,
    sourceId: row.sentence_id === null ? null : String(row.sentence_id),
    sourceUrl: row.sentence_id === null ? null : `https://tatoeba.org/en/sentences/show/${row.sentence_id}`,
  }]));
  await writeFile(join(output, `${shard}.json`), `${JSON.stringify(data)}\n`, "utf8");
}
await writeFile(join(output, "manifest.json"), `${JSON.stringify({
  source: "EJCSV",
  sourceVersion,
  generatedAt: new Date().toISOString(),
  shards: [...shards.keys()].sort(),
  entries: rows.length,
})}\n`, "utf8");
db.close();
