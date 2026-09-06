-- ============================================================
-- Client Project Status Dashboard — schema
-- Target: Neon Postgres. Idempotent: re-running is a no-op.
-- Apply with: npm run db:push
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------- clients: the company an invited person belongs to ----------
CREATE TABLE IF NOT EXISTS clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- users: the owner plus invited client contacts ----------
-- role='owner'  -> client_id IS NULL, sees everything
-- role='client' -> client_id NOT NULL, sees only that client's projects
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  email_norm    TEXT        NOT NULL,          -- lower(trim(email)); the lookup key
  name          TEXT,
  role          TEXT        NOT NULL DEFAULT 'client',
  client_id     UUID        REFERENCES clients(id) ON DELETE CASCADE,
  disabled_at   TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_role_chk  CHECK (role IN ('owner','client')),
  CONSTRAINT users_scope_chk CHECK (
    (role = 'owner'  AND client_id IS NULL) OR
    (role = 'client' AND client_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_norm_key ON users (email_norm);
CREATE INDEX IF NOT EXISTS users_client_idx ON users (client_id);

-- ---------- projects ----------
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  summary     TEXT,                            -- one line: what this is
  status      TEXT        NOT NULL DEFAULT 'queued',
  phase_note  TEXT,                            -- free text: "Checkout + payments"
  progress    SMALLINT    NOT NULL DEFAULT 0,  -- 0..100
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- KEEP IN SYNC with STATUS_IDS in src/lib/status.js
  CONSTRAINT projects_status_chk CHECK (status IN (
    'queued','discovery','design','building','review','blocked','live')),
  CONSTRAINT projects_progress_chk CHECK (progress BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS projects_client_idx
  ON projects (client_id, archived_at, sort_order);

-- ---------- project_links: live / staging / repo / docs ----------
CREATE TABLE IF NOT EXISTS project_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL,
  label      TEXT,                   -- overrides the default button label
  url        TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT project_links_kind_chk CHECK (kind IN ('live','staging','repo','docs','other')),
  CONSTRAINT project_links_url_chk  CHECK (url ~ '^https://')
);
CREATE INDEX IF NOT EXISTS project_links_project_idx
  ON project_links (project_id, sort_order);

-- ---------- updates: the changelog the client reads ----------
CREATE TABLE IF NOT EXISTS updates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body           TEXT        NOT NULL,
  status_at_time TEXT,                 -- snapshot of status when posted
  author_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS updates_project_recent_idx
  ON updates (project_id, created_at DESC);

-- ---------- magic_link_tokens ----------
-- token_hash = hex(sha256(raw)). The raw token exists only in the email:
-- a database dump yields nothing usable.
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token_hash   TEXT PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  requested_ip TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mlt_user_recent_idx ON magic_link_tokens (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mlt_expiry_idx      ON magic_link_tokens (expires_at);

-- ---------- rate_limits: fixed-window counter, no Redis ----------
-- Swept opportunistically from api/auth/request.js.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,      -- 'email:foo@bar.com' | 'ip:1.2.3.4'
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL
);
