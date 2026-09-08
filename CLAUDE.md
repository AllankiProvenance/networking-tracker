# Networking Tracker — project conventions

Graded assignment: a secure contacts/relationship tracker. The database is
the security boundary; treat any change that weakens that as a bug.

## Stack (fixed — do not substitute)

- Next.js App Router + TypeScript + Tailwind (v4, `@tailwindcss/postcss`).
- Neon Postgres, Neon Auth (Managed Better Auth), Neon Data API (PostgREST).
- `@neondatabase/neon-js` initialized with the **two-URL object form**
  (`{ auth: { url }, dataApi: { url } }`) in [lib/neon.ts](lib/neon.ts).

## Hard rules

- **Frontend/backend split**: `app/`, `components/`, `lib/` are browser code
  and may only touch the Data API via `neon` from `lib/neon.ts`. Privileged
  work (schema, RLS, grants, seeding, direct SQL) lives only in `db/` and
  `tests/`, which use `DATABASE_URL` via `pg`.
- **Never** import `DATABASE_URL` (or any secret) in app code; no secret ever
  gets a `NEXT_PUBLIC_` prefix. Only the two Neon endpoint URLs are public.
- **Never** send `user_id` from the client. The column default
  `auth.user_id()` fills it; the INSERT policy's WITH CHECK verifies it.
- Trusted validation lives in Postgres (NOT NULL / CHECK constraints).
  Client-side validation is UX only — adding it is fine, relying on it is not.
- Sorting/filtering must be Data API query params (`.eq()`, `.order()`), not
  in-browser array filtering.
- Schema changes: add a new numbered file in `db/migrations/` (files run in
  sort order, tracked in `_migrations`); never edit an applied migration.
  After migrating, refresh the Data API schema cache in the Neon console.
- Any new table gets RLS enabled plus four per-command policies
  (`auth.user_id() = user_id`), least-privilege grants to `authenticated`,
  and nothing for `anon` — mirror `0001_init.sql`.

## Commands

- `npm run dev` — dev server
- `npm run migrate` — apply migrations over `DATABASE_URL` (server-only)
- `npm test` — Vitest against the live database (needs `DATABASE_URL`,
  migrations applied); keep tests non-destructive (rolled-back transactions)
- `npm run build` — production build

## Style

- Allowed `priority` values are defined once in [lib/types.ts](lib/types.ts)
  (`PRIORITIES`) and mirrored by the CHECK constraint — change both together.
- Plain Tailwind utility classes, no UI libraries. Keep the smallest complete
  implementation: no extra features or speculative abstractions.
