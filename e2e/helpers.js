import { readFileSync } from "node:fs";
import { neon, neonConfig } from "@neondatabase/serverless";

/**
 * Test-side .env reader. Playwright has no --env-file equivalent, and the
 * suite needs the same DATABASE_URL the dev server is using.
 */
function loadEnv() {
  const out = {};
  let raw;
  try {
    raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();

// Same dev-only escape hatch as api/_lib/db.js and scripts/seed.mjs.
if (env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = env.NEON_FETCH_ENDPOINT;

export const sql = neon(env.DATABASE_URL);
export const OWNER_EMAIL = env.OWNER_EMAIL;

const b64u = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sha256hex(s) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign a browser context in as `email`.
 *
 * Mints a magic-link token directly rather than scraping it out of the dev
 * server's stdout — the raw token only ever exists in the email, so there is no
 * way to read one back out of the database after the fact. Everything from the
 * link onward is the real thing: this drives api/auth/verify, which is what
 * sets the session cookie.
 */
export async function signIn(page, email) {
  const [user] = await sql`SELECT id FROM users WHERE email_norm = ${email.toLowerCase()}`;
  if (!user) throw new Error(`No such user: ${email}`);

  const raw = b64u(crypto.getRandomValues(new Uint8Array(32)));
  await sql`
    INSERT INTO magic_link_tokens (token_hash, user_id, expires_at)
    VALUES (${await sha256hex(raw)}, ${user.id}, now() + interval '15 minutes')`;

  await page.goto(`/api/auth/verify?t=${raw}`);
  await page.waitForURL("/");
}

/** A client id that exists, creating one if the database has none. */
export async function ensureClient(name) {
  const [existing] = await sql`SELECT id FROM clients WHERE name = ${name} LIMIT 1`;
  if (existing) return existing.id;
  const [row] = await sql`INSERT INTO clients (name) VALUES (${name}) RETURNING id`;
  return row.id;
}

export const unique = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
