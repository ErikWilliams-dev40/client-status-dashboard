# CLAUDE.md — Client Project Status Dashboard

## Project

A client-facing project status dashboard. The **owner** (freelancer/agency) manages
projects; **clients** sign in with an invite-only magic link and see only the projects
they are waiting on — name, status, latest update, and buttons to the live/staging/repo
URLs.

React + Vite SPA, Vercel Edge Functions under `api/`, Neon Postgres for storage.

> This repo was previously "Claude Architect Studio", a 5-tab GenAI demo. That app was
> removed wholesale in the pivot; it is recoverable at the initial commit if ever needed.

## Stack

- React 18 (hooks, Vite 6) — no router, no UI library, no state library
- Vercel Edge Functions (`api/`), Neon Postgres via `@neondatabase/serverless`
- Resend for transactional email (plain `fetch`, no SDK)
- Fonts: Space Grotesk (UI), JetBrains Mono (data/IDs/timestamps)

## File Structure

```text
index.html                  HTML shell
vite.config.js              Vite config + local /api bridge
vite-plugin-api.js          Dev-only: serves api/**/*.js as Edge-style handlers
vercel.json                 SPA rewrite (everything but /api/* -> index.html)
db/schema.sql               Idempotent DDL — the source of truth for the schema
scripts/db.mjs              Runs a .sql file against DATABASE_URL
scripts/seed.mjs            Upserts the owner + a demo client/project
api/_lib/db.js              neon() client factory
api/_lib/session.js         HMAC-SHA256 cookie sign/verify (Web Crypto)
api/_lib/auth.js            requireUser(req, { role }) — the only authz entry point
api/_lib/queries.js         Shared SQL, incl. the client-scoped project read
api/auth/request.js         POST — request a magic link
api/auth/verify.js          GET (inert interstitial) / POST (consume + set cookie)
api/auth/logout.js          POST — clear the cookie
api/data.js                 GET — the whole dashboard in one round trip
api/admin.js                POST — owner-only writes, dispatched on `action`
src/App.jsx                 Session bootstrap + view switch
src/theme.js                Color palette + font constants
src/styles.css              Global CSS — reset, .card, animations, .projects-grid
src/lib/                    api.js, status.js, format.js, useRoute.js
src/components/             Icon, Shell, Button, Field, StatusBadge, EmptyState, Toast
src/views/                  LoginView, DashboardView, ProjectDetail, AdminView
src/admin/                  ProjectEditor, UpdateComposer, ClientManager
```

## Commands

```bash
npm install
npm run dev              # Vite at localhost:5173, /api/* served in-process
npm run db:push          # Apply db/schema.sql to DATABASE_URL (idempotent)
npm run db:seed          # Upsert the owner from OWNER_EMAIL + demo data
vercel deploy --prod
```

Requires Node 20.6+ for `--env-file` (Node 22 is what's installed).

## Conventions

### Security — these are not style preferences

- **Never accept a `client_id` (or any tenant identifier) from a client request.** Scope
  comes only from the verified session cookie. The single authorized read is
  `listProjectsFor()` in `api/_lib/queries.js`; add new client-facing reads there so
  there is one place to audit.
- All authorization goes through `requireUser()` in `api/_lib/auth.js`. Don't verify
  cookies inline in a handler.
- `api/auth/verify.js`: **`GET` must stay inert — only `POST` consumes the token.**
  Corporate mail scanners (Defender Safe Links, Proofpoint) `GET` every link in an
  inbound email; a consuming `GET` burns the link before the client clicks it. Do not
  "simplify" this into a single GET handler.
- `api/auth/request.js` always returns `200 { ok: true }` — for unknown emails, invalid
  syntax, and rate-limited requests alike. Never branch the response on whether the
  account exists.
- Magic link tokens are stored **hashed** (`sha256hex`). Never write or log the raw token.
- Compare signatures with `crypto.subtle.verify`, never with `===`.
- Mutating endpoints are `POST`-only; that plus `SameSite=Lax` is the CSRF defense.

### Code

- All colors come from `src/theme.js`. Don't repeat raw hex inline.
- All statuses come from `STATUSES` / `STATUS_IDS` in `src/lib/status.js`. It imports no
  React so `api/admin.js` can import it too.
  **`projects_status_chk` in `db/schema.sql` is a second copy of that list — change both.**
- All browser fetches go through `src/lib/api.js`.
- Every handler under `api/` is `export const config = { runtime: "edge" }`. No `node:`
  imports — Neon HTTP, Resend, and Web Crypto all work on Edge.
- The Neon HTTP driver has **no interactive transactions.** For an atomic multi-statement
  write, use a single CTE statement (see `update.post` in `api/admin.js`).
- Inline styles + `src/styles.css` only. No external UI libraries.
- No localStorage — session lives in an httpOnly cookie, everything else in `useState`.
- One component per file.

## Environment

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | Vercel (all) + `.env` | Neon **pooled** string (`-pooler` host), `?sslmode=require` |
| `SESSION_SECRET` | Vercel (all) + `.env` | `openssl rand -base64 48`. Different per environment. Rotating logs everyone out |
| `RESEND_API_KEY` | Vercel; `.env` optional | Absent locally → link is logged to the terminal |
| `MAIL_FROM` | Vercel + `.env` | Domain must be verified in Resend |
| `APP_URL` | Vercel per-env + `.env` | Absolute origin. Local: `http://localhost:5173` |
| `OWNER_EMAIL` / `OWNER_NAME` | `.env` only | Read by `scripts/seed.mjs`, never at runtime |
| `DEV_MAGIC_LINK_LOG` | `.env` only | Ignored unless `VERCEL_ENV` is undefined |

## Status Model

`queued → discovery → design → building → review → blocked → live`

`building` and `review` pulse in the UI — they mean "in motion" and "waiting on you".

## Current Status

**Phase 0 — Complete.** Studio removed, docs rewritten, shell renders.

Remaining: 1 (database) · 2 (dev API bridge) · 3 (auth) · 4 (read path) ·
5 (admin writes) · 6 (deploy).
