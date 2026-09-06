import { neon } from "@neondatabase/serverless";

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
