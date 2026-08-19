import { readFile } from "node:fs/promises";

const configText = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const config = JSON.parse(configText.replace(/^\s*\/\/.*$/gm, ""));
const database = config.d1_databases?.find((entry) => entry.binding === "DB");
const audio = config.r2_buckets?.find((entry) => entry.binding === "AUDIO");
const errors = [];

if (database?.database_id !== "97d7b5bd-3c01-468c-ac2d-dfa5cb342c22") {
  errors.push("DB binding must use the provisioned production D1 database ID");
}
if (!database?.database_name || database.database_name.includes("local")) {
  errors.push("DB binding must use a production database name");
}
if (!audio?.bucket_name || audio.bucket_name.includes("<") || audio.bucket_name.includes("local")) {
  errors.push("AUDIO binding must use a provisioned production R2 bucket name");
}
if (JSON.stringify(config).includes("localhost")) {
  errors.push("Production Wrangler configuration must not contain localhost URLs");
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Production config OK: D1 ${database.database_id}, R2 ${audio.bucket_name}`);
