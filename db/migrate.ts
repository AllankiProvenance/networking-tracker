// Server-only migration runner. Run with: npm run migrate
// Uses DATABASE_URL (owner credentials) — never imported by app code.
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
    );
    for (const file of files) {
      const applied = await client.query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
      if (applied.rowCount) {
        console.log(`skipped ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`failed ${file}`);
        throw err;
      }
    }
    console.log("Migrations complete. Remember to refresh the Data API schema cache in the Neon console.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
