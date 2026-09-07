import { neon, neonConfig } from "@neondatabase/serverless";

// Local development only: point the HTTP driver at a Neon proxy running on
// localhost. The driver otherwise derives its endpoint as https://api.<host>/sql,
// which no local proxy can serve. Guarded on VERCEL_ENV — always set on a
// deploy — so it cannot take effect anywhere but a developer's machine.
if (!process.env.VERCEL_ENV && process.env.NEON_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
}

let client;

/**
 * Neon HTTP client. Stateless (one fetch per query), so there is no pool to
 * exhaust on Edge — do NOT swap this for Pool/WebSocket in a handler.
 *
 * Consequence: no interactive transactions. Where a write must be atomic
 * across statements, express it as a single CTE statement instead.
 */
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

/** JSON response helper. */
export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
