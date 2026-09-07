import { db } from "../_lib/db.js";
import { sessionCookie, sha256hex, signSession } from "../_lib/session.js";

export const config = { runtime: "edge" };

/**
 * GET is inert; only POST consumes the token.
 *
 * Corporate mail scanners (Defender Safe Links, Proofpoint URL Defense, Gmail's
 * proxy) issue a GET against every link in an inbound email. If GET consumed
 * the token, clients on those tenants would hit a dead link every single time.
 *
 * Three properties carry this: scanners GET but never POST, scanners don't run
 * JS, and the <noscript> button covers humans with JS disabled.
 *
 * DO NOT "simplify" this into a single GET handler.
 */
export default async function handler(req) {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const safe = (url.searchParams.get("t") ?? "").replace(/[^A-Za-z0-9_-]/g, "");
    return new Response(interstitialHtml(safe), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let raw = "";
  try {
    raw = String((await req.formData()).get("t") ?? "");
  } catch {
    return redirect("/?e=expired");
  }
  if (!raw) return redirect("/?e=expired");

  const sql = db();

  // Single-use is enforced by the WHERE clause on the UPDATE, not by a
  // read-then-write: a concurrent double submit returns zero rows to the loser.
  const [row] = await sql`
    UPDATE magic_link_tokens SET consumed_at = now()
     WHERE token_hash = ${await sha256hex(raw)}
       AND consumed_at IS NULL AND expires_at > now()
     RETURNING user_id`;
  if (!row) return redirect("/?e=expired");

  const [user] = await sql`
    UPDATE users SET last_login_at = now()
     WHERE id = ${row.user_id} AND disabled_at IS NULL
     RETURNING id, role, client_id`;
  if (!user) return redirect("/?e=expired");

  const token = await signSession({ uid: user.id, role: user.role, cid: user.client_id });

  // 303 so the browser follows with a GET rather than re-POSTing to /.
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookie(token),
      "Cache-Control": "no-store",
    },
  });
}

const redirect = (to) =>
  new Response(null, { status: 303, headers: { Location: to, "Cache-Control": "no-store" } });

// `token` is already stripped to [A-Za-z0-9_-] by the caller, so it cannot
// break out of the attribute.
const interstitialHtml = (token) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Signing you in&hellip;</title>
<style>
  html,body{height:100%}
  body{margin:0;display:grid;place-items:center;background:#070B14;color:#E2E8F0;
       font-family:'Space Grotesk',-apple-system,Segoe UI,sans-serif;font-size:14px}
  button{padding:11px 18px;border:0;border-radius:8px;background:#0EA5E9;color:#fff;
         font:inherit;font-weight:600;cursor:pointer}
  p{color:#94A3B8}
</style></head>
<body>
  <form id="f" method="POST" action="/api/auth/verify">
    <input type="hidden" name="t" value="${token}">
    <p>Confirming your sign-in&hellip;</p>
    <noscript><button type="submit">Continue to your dashboard</button></noscript>
  </form>
  <script>document.getElementById('f').submit();</script>
</body></html>`;
