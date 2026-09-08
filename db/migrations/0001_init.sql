-- Networking tracker: contacts table, database-enforced validation, RLS.
-- Requires Neon Auth + Data API to be enabled first (provides auth.user_id()
-- and the authenticated/anon roles).

CREATE TABLE contacts (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        text NOT NULL DEFAULT (auth.user_id()),
  name           text NOT NULL CHECK (length(btrim(name)) > 0),
  company        text,
  role           text,
  email          text,
  phone          text,
  priority       text NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high')),
  last_contacted date,
  next_followup  date,
  tags           text[] NOT NULL DEFAULT '{}',
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for the sort/filter paths; every query is scoped to user_id by RLS.
CREATE INDEX contacts_user_name_idx           ON contacts (user_id, name);
CREATE INDEX contacts_user_priority_idx       ON contacts (user_id, priority);
CREATE INDEX contacts_user_next_followup_idx  ON contacts (user_id, next_followup);
CREATE INDEX contacts_user_last_contacted_idx ON contacts (user_id, last_contacted);

-- Row Level Security: the database is the security boundary.
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

-- Least-privilege grants. Do NOT use the console's "Grant public schema
-- access" option; these are the only privileges the app needs.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE contacts_id_seq TO authenticated;

-- Defensive: anon must never see this table.
REVOKE ALL ON contacts FROM anon;
