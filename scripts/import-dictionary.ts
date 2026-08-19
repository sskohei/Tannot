import { readFile } from "node:fs/promises";

type Entry = { term: string; translation: string };

function normalize(term: string) {
  return term.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

const input = process.argv[2];
if (!input) throw new Error("Usage: tsx scripts/import-dictionary.ts path/to/entries.json");
const entries = JSON.parse(await readFile(input, "utf8")) as Entry[];
const sql = entries.map((entry) => {
  const quote = (value: string) => value.replaceAll("'", "''");
  return `INSERT OR REPLACE INTO dictionary_entries (normalized_term, term, translation, source_name, source_version) VALUES ('${quote(normalize(entry.term))}', '${quote(entry.term.trim())}', '${quote(entry.translation.trim())}', 'EJDict', 'imported');`;
}).join("\n");
process.stdout.write(`${sql}\n`);
