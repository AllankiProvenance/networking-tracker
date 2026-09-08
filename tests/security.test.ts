// Proves the graded security core against the live database:
//  1. Validation lives in Postgres (CHECK / NOT NULL), not the client.
//  2. RLS is enabled with four per-command policies scoped to auth.user_id().
//  3. anon has no privileges on contacts.
//
// Requires DATABASE_URL in .env (same one `npm run migrate` uses) and the
// migration applied first. Constraint tests run inside rolled-back
// transactions, so the database is left unchanged.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

let client: Client;

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env, fill it in, and run `npm run migrate` first."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  await client?.end();
});

describe("database-enforced validation", () => {
  it("rejects a priority outside low/medium/high (CHECK constraint)", async () => {
    await client.query("BEGIN");
    await expect(
      client.query(
        "INSERT INTO contacts (user_id, name, priority) VALUES ('test-user', 'Bad Priority', 'urgent')"
      )
    ).rejects.toMatchObject({ code: "23514" }); // check_violation
    await client.query("ROLLBACK");
  });

  it("rejects a NULL name (NOT NULL constraint)", async () => {
    await client.query("BEGIN");
    await expect(
      client.query("INSERT INTO contacts (user_id, name) VALUES ('test-user', NULL)")
    ).rejects.toMatchObject({ code: "23502" }); // not_null_violation
    await client.query("ROLLBACK");
  });

  it("rejects a blank name (CHECK constraint)", async () => {
    await client.query("BEGIN");
    await expect(
      client.query("INSERT INTO contacts (user_id, name) VALUES ('test-user', '   ')")
    ).rejects.toMatchObject({ code: "23514" });
    await client.query("ROLLBACK");
  });
});

describe("row level security", () => {
  it("has RLS enabled on contacts", async () => {
    const { rows } = await client.query(
      "SELECT relrowsecurity FROM pg_class WHERE relname = 'contacts' AND relnamespace = 'public'::regnamespace"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].relrowsecurity).toBe(true);
  });

  it("has exactly four per-command policies scoped to auth.user_id() = user_id", async () => {
    const { rows } = await client.query(
      "SELECT cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts'"
    );
    const byCmd = Object.fromEntries(rows.map((r) => [r.cmd, r]));
    expect(Object.keys(byCmd).sort()).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);

    const owns = /auth\.user_id\(\)\s*=\s*user_id/;
    expect(byCmd.SELECT.qual).toMatch(owns);
    expect(byCmd.INSERT.with_check).toMatch(owns);
    expect(byCmd.UPDATE.qual).toMatch(owns); // USING: can only target own rows
    expect(byCmd.UPDATE.with_check).toMatch(owns); // WITH CHECK: cannot reassign user_id
    expect(byCmd.DELETE.qual).toMatch(owns);
  });

  it("grants anon no privileges on contacts", async () => {
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'anon'");
    if (role.rowCount === 0) return; // anon not provisioned: nothing is granted at all
    const { rows } = await client.query(
      `SELECT bool_or(has_table_privilege('anon', 'public.contacts', p)) AS any_priv
       FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS p`
    );
    expect(rows[0].any_priv).toBe(false);
  });
});
