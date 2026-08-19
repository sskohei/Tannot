import { readFile } from "node:fs/promises";

const configText = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const config = JSON.parse(configText.replace(/^\s*\/\/.*$/gm, ""));
const database = config.d1_databases?.find((entry) => entry.binding === "DB");
const staging = config.env?.staging;
const stagingDatabase = staging?.d1_databases?.find((entry) => entry.binding === "DB");
const errors = [];

if (database?.database_id !== "97d7b5bd-3c01-468c-ac2d-dfa5cb342c22") {
  errors.push("DB binding must use the provisioned production D1 database ID");
}
if (!database?.database_name || database.database_name.includes("local")) {
  errors.push("DB binding must use a production database name");
}
if (staging?.name !== "tannot-staging") {
  errors.push("staging environment must deploy as tannot-staging");
}
if (stagingDatabase?.database_id !== "83eb9c6e-25f3-439a-b224-83417cf9b4e8") {
  errors.push("staging DB binding must use the provisioned staging D1 database ID");
}
if (stagingDatabase?.database_name !== "tannot-staging") {
  errors.push("staging DB binding must use the staging database name");
}
if (config.r2_buckets || staging?.r2_buckets) {
  errors.push("R2 bindings are not required by the current application");
}
if (JSON.stringify(config).includes("localhost")) {
  errors.push("Production Wrangler configuration must not contain localhost URLs");
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Production config OK: D1 ${database.database_id}; staging D1 ${stagingDatabase.database_id}; audio uses the browser Web Speech API`);
