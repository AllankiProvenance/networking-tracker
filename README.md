# Networking Tracker

A secure personal networking / relationship tracker. Next.js App Router +
TypeScript + Tailwind on the frontend; Neon Postgres with Neon Auth (Managed
Better Auth) and the Neon Data API (PostgREST) as the backend. The security
boundary is the database itself — Row Level Security and constraints enforce
everything, and the UI is just a convenient client.

## Architecture

```
Browser (Next.js client components)
  │  @neondatabase/neon-js  — session JWT attached automatically
  ├──► Neon Auth endpoint      (sign up / sign in / session)
  └──► Neon Data API (PostgREST over HTTPS)
          │  runs as role `authenticated`, JWT sub → auth.user_id()
          ▼
       Neon Postgres — NOT NULL / CHECK constraints + RLS policies
```

**Frontend/backend split.** Everything under `app/`, `components/`, and
`lib/` is browser code and talks only to the Data API under the signed-in
user's session. Everything privileged lives in server-only scripts:
`db/migrate.ts` (schema, RLS, grants) and `tests/` connect directly over
`DATABASE_URL` and are never bundled into the app. There is no application
server holding secrets — trusted validation and authorization live in
Postgres, where no client can bypass them.

**Client validation is UX only.** The form marks required fields and offers a
priority dropdown, but the row is accepted or rejected by the database's
NOT NULL and CHECK constraints regardless of what a client sends.

## Setup

### 1. Neon project

1. Create a project at [console.neon.tech](https://console.neon.tech).
2. **Enable Neon Auth**: in the project console, open **Auth** and enable it
   (Managed Better Auth). Email/password is enabled by default. Copy the
   **Auth URL**.
3. **Enable the Data API**: open **Data API** on the branch you're using and
   enable it for your database, with Neon Auth as the authentication
   provider. **Leave "Grant public schema access" unchecked** — this project
   grants least-privilege access in its migration instead. Copy the
   **Data API URL**.
4. Copy the **connection string** (owner role) from the project dashboard.

### 2. Local configuration

```bash
cp .env.example .env
```

Fill in:

| Variable | Visibility | Purpose |
|---|---|---|
| `DATABASE_URL` | **server-only** | Owner credentials for migrations and tests. Never gets a `NEXT_PUBLIC_` prefix; never imported by app code. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | public by design | The auth endpoint URL. Contains no secret — signing in still requires the user's credentials. |
| `NEXT_PUBLIC_NEON_DATA_API_URL` | public by design | The Data API endpoint URL. Contains no secret — every request needs a valid JWT and is constrained by grants + RLS. |

### 3. Migrate and run

```bash
npm install
npm run migrate
```

Then in the Neon console: **Data API → Refresh schema cache** (PostgREST
caches the schema; the new table isn't visible to it until you refresh).

```bash
npm run dev
```

Open http://localhost:3000, sign up, and add contacts.

## Schema

`db/migrations/0001_init.sql` — a single `contacts` table:

- `user_id text NOT NULL DEFAULT (auth.user_id())` — filled server-side from
  the JWT `sub` claim. The client never sends it.
- `name text NOT NULL CHECK (length(btrim(name)) > 0)` — required, non-blank.
- `priority text NOT NULL CHECK (priority IN ('low','medium','high'))` — the
  allowed set is enforced in the database, not the client.
- `company`, `role`, `email`, `phone`, `last_contacted`, `next_followup`,
  `tags text[]`, `notes`, `created_at`, `updated_at` (maintained by a
  `BEFORE UPDATE` trigger).
- Composite indexes on `(user_id, name)`, `(user_id, priority)`,
  `(user_id, next_followup)`, `(user_id, last_contacted)` — every query is
  scoped to `user_id` by RLS, and these cover the sort/filter paths.

## Security model

The Data API validates the session JWT and runs queries as the
`authenticated` Postgres role with the JWT's `sub` claim exposed as
`auth.user_id()`. RLS is enabled and four per-command policies scope every
operation to the owner:

```sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select ON contacts FOR SELECT TO authenticated
  USING (auth.user_id() = user_id);

CREATE POLICY contacts_insert ON contacts FOR INSERT TO authenticated
  WITH CHECK (auth.user_id() = user_id);

CREATE POLICY contacts_update ON contacts FOR UPDATE TO authenticated
  USING (auth.user_id() = user_id)
  WITH CHECK (auth.user_id() = user_id);

CREATE POLICY contacts_delete ON contacts FOR DELETE TO authenticated
  USING (auth.user_id() = user_id);
```

- **SELECT / DELETE `USING`**: rows belonging to other users are invisible to
  the statement — they can't be read or deleted.
- **INSERT `WITH CHECK`**: evaluated after column defaults apply. A forged
  `user_id` in the payload fails `auth.user_id() = user_id` (the identity
  comes from the verified JWT, which the client can't fake) and the insert is
  rejected before the row exists.
- **UPDATE `USING` + `WITH CHECK`**: `USING` stops you targeting anyone
  else's rows (0 rows matched); `WITH CHECK` stops you reassigning your own
  row's `user_id` to another user.

Grants are least-privilege:

```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE contacts_id_seq TO authenticated;
REVOKE ALL ON contacts FROM anon;
```

`anon` (unauthenticated requests) has no privileges on the table at all, so
requests without a valid JWT fail before RLS is even consulted.

## Testing

```bash
npm test
```

Runs Vitest against the **live database** over `DATABASE_URL` (run
`npm run migrate` first). [tests/security.test.ts](tests/security.test.ts)
proves:

1. Inserting `priority = 'urgent'` fails with a check-constraint violation,
   and NULL/blank names are rejected — validation lives in Postgres.
2. RLS is enabled, and `pg_policies` contains exactly the four per-command
   policies with `auth.user_id() = user_id` in the right `USING`/`WITH CHECK`
   slots.
3. The `anon` role holds no privileges on `contacts`.

Constraint tests run inside rolled-back transactions, so the database is left
unchanged.

## Deploying to Vercel

1. Push the repo to GitHub and import it into Vercel (framework preset:
   Next.js; no custom build settings needed).
2. In **Project → Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_NEON_AUTH_URL` (Production/Preview/Development)
   - `NEXT_PUBLIC_NEON_DATA_API_URL` (Production/Preview/Development)
   - `DATABASE_URL` — only needed if you run migrations/tests in CI; the
     deployed app itself never uses it. Keep it out of the client bundle by
     never prefixing it with `NEXT_PUBLIC_`.
3. Deploy. Run `npm run migrate` locally (or in CI) against the same branch
   the Data API is enabled on — migrations are not part of the Vercel build.
4. In the Neon console, add your Vercel domain to Neon Auth's allowed origins
   if prompted.
