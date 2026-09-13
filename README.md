# Project Status Dashboard

A small, client-facing dashboard for showing clients where their projects stand.

Clients sign in with an invite-only magic link — no passwords, no self-signup — and see
only the projects they're waiting on: current status, the latest update, and buttons
straight through to the live site, staging, or the repo. The owner manages everything
from inside the same app, so changing a status doesn't need a redeploy.

![Project Status dashboard frontend](./frontend-preview.png)

## Stack

React 18 + Vite 6 · Vercel Edge Functions · Neon Postgres · Resend

No router, no UI library, no state library, no ORM. One runtime dependency beyond React
(`@neondatabase/serverless`).

## Getting started

Requires Node 20.6+ (for `--env-file`).

```bash
npm install
cp .env.example .env      # then fill it in — see the table below
npm run db:push           # create the schema (idempotent)
npm run db:seed           # create your owner account
npm run dev               # http://localhost:5173
```

Without `RESEND_API_KEY` set, sign-in links are printed to the dev server terminal
instead of emailed, so you can develop the whole auth flow offline.

## Local development without Neon

You can run the whole stack against Postgres in Docker — no Neon account, no network.
The HTTP driver normally derives its endpoint as `https://api.<host>/sql`, so a local
proxy needs `NEON_FETCH_ENDPOINT` to redirect it.

```bash
docker network create statusnet

docker run -d --name status-pg --network statusnet \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=status \
  postgres:16

docker run -d --name status-neon-proxy --network statusnet -p 4444:4444 \
  -e PG_CONNECTION_STRING=postgres://postgres:postgres@status-pg:5432/status \
  ghcr.io/timowilhelm/local-neon-http-proxy:main
```

Then in `.env`:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:4444/status?sslmode=require
NEON_FETCH_ENDPOINT=http://localhost:4444/sql
```

Apply the schema with `psql` rather than `npm run db:push` — `db:push` connects over
WebSocket, which this proxy does not speak:

```bash
docker exec -i status-pg psql -U postgres -d status -v ON_ERROR_STOP=1 -f - < db/schema.sql
npm run db:seed
```

`db:seed` creates the owner and two demo clients, but no *client* user. Sign in as the
owner, open **Admin → Clients**, and invite one — that is what the screen is for. (This
used to require a manual `INSERT`; it no longer does.)

## Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (the `-pooler` host), `?sslmode=require` |
| `SESSION_SECRET` | yes | `openssl rand -base64 48`. Use a different value per environment |
| `APP_URL` | yes | Absolute origin, e.g. `http://localhost:5173` |
| `RESEND_API_KEY` | prod | Omit locally to log links to the terminal |
| `MAIL_FROM` | prod | e.g. `Status <status@example.com>`; domain verified in Resend |
| `OWNER_EMAIL` | seed | Your email — becomes the owner account |
| `OWNER_NAME` | seed | Optional display name |

## How access works

The owner creates a client, then invites an email address against it. That invite sends
nothing — you tell the client to visit the site and enter their address themselves. They
get a link valid for 15 minutes, single-use, which sets a 14-day session cookie.

A client only ever sees their own client's projects. Scope is derived from the signed
session cookie and never from anything the browser sends, so there is no request a client
can craft to widen it.

## Deploying

```bash
vercel deploy --prod
```

Set every variable from the table in the Vercel project settings first, with `APP_URL`
pointing at the real domain and a `SESSION_SECRET` distinct from your local one.

## Statuses

`Queued` → `Discovery` → `Design` → `In Build` → `Your Review` → `Blocked` → `Live`

`In Build` and `Your Review` pulse in the UI — they're the two that mean something is
moving or something is waiting on the client.

## Project status

**Phases 0–5 are complete:** the studio removal, schema and migration scripts, `/api/*`
served in dev, magic-link auth, the client read path, and the owner's admin screen —
projects, links, updates, clients, and client contacts, all editable in the app.

Verified against a real Postgres 16 behind a local Neon HTTP proxy, and click-tested
in a real browser with `npm run test:e2e`. That covers the two gaps the previous
version of this file listed: `popstate` navigation and the card-link click behavior
are now tested live rather than reasoned about.

**One gap remains:** `npm run db:push` still hasn't run against a real Neon endpoint.
It connects over WebSocket, which the local proxy doesn't speak, so the schema is
applied with `psql` locally. `npm run db:seed` (HTTP driver) is verified.

**Remaining work:** Phase 6 (deploy).

## Testing

```bash
npm run test:e2e
```

Playwright drives the dev server against the real database — there are no mocks. The
specs run serially against one Postgres, so don't parallelize them.

Signing in inside a test does not scrape the magic link out of the dev log: the raw
token is never stored (only its hash), so `e2e/helpers.js` mints its own token and
then goes through the real `api/auth/verify`.

## History

This repo previously held *Claude Architect Studio*, a five-tab GenAI architecture demo.
It was replaced wholesale and is preserved in the initial commit.
