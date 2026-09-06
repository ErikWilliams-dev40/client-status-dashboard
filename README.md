# Project Status Dashboard

A small, client-facing dashboard for showing clients where their projects stand.

Clients sign in with an invite-only magic link — no passwords, no self-signup — and see
only the projects they're waiting on: current status, the latest update, and buttons
straight through to the live site, staging, or the repo. The owner manages everything
from inside the same app, so changing a status doesn't need a redeploy.

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

## History

This repo previously held *Claude Architect Studio*, a five-tab GenAI architecture demo.
It was replaced wholesale and is preserved in the initial commit.
