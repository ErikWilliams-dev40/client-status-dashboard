import { db, json } from "./db.js";
import { SESSION_COOKIE, clearCookie, readCookie, verifySession } from "./session.js";

/**
 * The only authorization entry point. Do not verify cookies inline in a handler.
 *
 * Returns either { user, sql } or { error: Response }. The caller returns
 * `error` verbatim.
 *
 * The user row is re-read on every request so a disabled or demoted user is
 * locked out immediately — that is what lets us skip a sessions table.
 * Matching `role = payload.role` means demoting an owner also invalidates
 * their outstanding owner cookies.
 */
export async function requireUser(req, { role } = {}) {
  const payload = await verifySession(readCookie(req, SESSION_COOKIE));
  if (!payload) return { error: json({ error: "unauthenticated" }, 401) };
  if (role && payload.role !== role) return { error: json({ error: "forbidden" }, 403) };

  const sql = db();
  const [u] = await sql`
    SELECT id, email, name, role, client_id FROM users
     WHERE id = ${payload.uid} AND disabled_at IS NULL AND role = ${payload.role}`;

  if (!u) {
    // The cookie verifies but the account no longer qualifies. Clear it so the
    // browser stops replaying a session that can never succeed.
    return {
      error: json({ error: "unauthenticated" }, 401, { "Set-Cookie": clearCookie() }),
    };
  }

  return {
    sql,
    user: { id: u.id, email: u.email, name: u.name, role: u.role, clientId: u.client_id },
  };
}

/**
 * CSRF backstop for mutating endpoints. SameSite=Lax plus POST-only is the
 * primary defense; this closes the residual window. A missing Origin header is
 * allowed — non-browser clients (curl) omit it, and they carry no ambient cookie.
 */
export function originOk(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(process.env.APP_URL).origin;
  } catch {
    return false;
  }
}
