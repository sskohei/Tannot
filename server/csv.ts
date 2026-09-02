import { normalizeTerm, parseTags, parseTitle, ValidationError } from "@/lib/validation";

export type CsvCard = { term: string; translation: string | null; sentence: string | null; tags: string[] };
export type ImportedCsvBook = { title: string; cards: CsvCard[] };

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new ValidationError("CSVの引用符を確認してください");
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((item) => item.some((value) => value.trim()));
}

export function parseImportedBooksCsv(csv: unknown): ImportedCsvBook[] {
  if (typeof csv !== "string" || csv.length === 0 || csv.length > 200_000) throw new ValidationError("CSVファイルを確認してください");
  const rows = parseRows(csv.replace(/^\uFEFF/u, ""));
  const [header, ...body] = rows;
  if (!header) throw new ValidationError("CSVにヘッダーがありません");
  const indexes = new Map(header.map((value, index) => [value.trim().toLocaleLowerCase("en-US"), index]));
  const titleIndex = indexes.get("book_title");
  const termIndex = indexes.get("term");
  if (titleIndex === undefined || termIndex === undefined) throw new ValidationError("CSVにはbook_titleとterm列が必要です");
  const books = new Map<string, ImportedCsvBook>();
  for (const row of body) {
    const title = parseTitle(row[titleIndex] ?? "");
    const term = (row[termIndex] ?? "").trim().replace(/\s+/gu, " ");
    if (!term || term.length > 100) throw new ValidationError("CSVの単語を確認してください");
    const key = title.toLocaleLowerCase("ja-JP");
    const book = books.get(key) ?? { title, cards: [] };
    if (book.cards.some((card) => normalizeTerm(card.term) === normalizeTerm(term))) continue;
    if (book.cards.length >= 100) throw new ValidationError("1つの単語帳には100枚まで読み込めます");
    const get = (name: string) => indexes.get(name) === undefined ? "" : row[indexes.get(name)!] ?? "";
    book.cards.push({
      term,
      translation: get("translation").trim() || null,
      sentence: get("sentence").trim() || null,
      tags: parseTags(get("tags")),
    });
    books.set(key, book);
  }
  const result = [...books.values()];
  if (!result.length || result.length > 20) throw new ValidationError("CSVには1〜20冊の単語帳を入力してください");
  return result;
}

function escape(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/u.test(text) ? `'${text}` : text;
  return /[",\r\n]/u.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function createCardsCsv(rows: Array<{ book_title: string; term: string; translation: string | null; sentence: string | null; tags: string }>): string {
  return ["book_title,term,translation,sentence,tags", ...rows.map((row) => [row.book_title, row.term, row.translation, row.sentence, row.tags].map(escape).join(","))].join("\r\n");
}
