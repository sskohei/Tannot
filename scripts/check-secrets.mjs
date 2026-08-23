import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("../", import.meta.url);
const ignoredDirectories = new Set([".git", ".next", ".open-next", ".wrangler", "node_modules", "coverage", "data"]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".jsonc", ".md", ".mjs", ".sql", ".ts", ".tsx", ".yaml", ".yml"]);
const secretPattern = /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b|\bwhsec_[A-Za-z0-9]{16,}\b/g;
const findings = [];

async function scan(directoryUrl) {
  for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await scan(new URL(`${entry.name}/`, directoryUrl));
      continue;
    }
    if (entry.name.startsWith(".env") && entry.name !== ".env.example") continue;
    if (!textExtensions.has(path.extname(entry.name)) && entry.name !== ".env.example") continue;

    const fileUrl = new URL(entry.name, directoryUrl);
    const contents = await readFile(fileUrl, "utf8");
    contents.split("\n").forEach((line, index) => {
      secretPattern.lastIndex = 0;
      if (secretPattern.test(line)) findings.push(`${path.relative(root.pathname, fileUrl.pathname)}:${index + 1}`);
    });
  }
}

await scan(root);

if (findings.length > 0) {
  console.error("Potential Stripe secret found. Values are intentionally hidden:");
  console.error(findings.map((finding) => `- ${finding}`).join("\n"));
  process.exit(1);
}

console.log("Secret scan passed");
