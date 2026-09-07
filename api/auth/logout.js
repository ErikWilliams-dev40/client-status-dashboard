import { clearCookie } from "../_lib/session.js";

export const config = { runtime: "edge" };

/**
 * POST -> 204 with the session cookie cleared. Nothing to delete server-side:
 * sessions are stateless signed cookies.
 *
 * POST-only so SameSite=Lax blocks cross-site logout CSRF.
 */
export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearCookie(), "Cache-Control": "no-store" },
  });
}
