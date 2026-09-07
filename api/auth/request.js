import { db, json } from "../_lib/db.js";
import { b64u, sha256hex } from "../_lib/session.js";

export const config = { runtime: "edge" };

const EMAIL_LIMIT = 3; // per 15 minutes, per address
const IP_LIMIT = 10; // per 15 minutes, per source IP

// Deliberately permissive: the point is to skip obviously-not-an-email input,
// not to adjudicate RFC 5322. Anything rejected here still returns 200.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * POST { email } -> ALWAYS 200 { ok: true }.
 *
 * Unknown address, malformed address, rate-limited, mail provider down: the
 * status and body are identical in every case. Never branch the response on
 * whether an account exists — that is the whole enumeration story, and the
 * rate-limit write is awaited on both paths so the timing delta is dominated
 * by the same DB round trip.
 */
export default async function handler(req, ctx) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Fail loudly rather than emailing a link to nowhere.
  const appUrl = process.env.APP_URL;
  if (!appUrl || !appUrl.startsWith("http")) {
    console.error("[auth/request] APP_URL is missing or not absolute");
    return json({ error: "server misconfigured" }, 500);
  }

  const ok = () => json({ ok: true });

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "");
  } catch {
    return ok();
  }

  const norm = email.trim().toLowerCase();
  const sql = db();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();

  // Rate-limit before validating, so a malformed address costs the same as a
  // well-formed one.
  const allowed = await underLimit(sql, `email:${norm}`, EMAIL_LIMIT);
  const ipAllowed = ip ? await underLimit(sql, `ip:${ip}`, IP_LIMIT) : true;

  sweep(sql, ctx);

  if (!allowed || !ipAllowed) return ok();
  if (!norm || norm.length > 320 || !EMAIL_RE.test(norm)) return ok();

  const [user] = await sql`
    SELECT id FROM users WHERE email_norm = ${norm} AND disabled_at IS NULL`;
  if (!user) return ok();

  // One live link at a time: requesting a new one kills the outstanding ones.
  await sql`
    UPDATE magic_link_tokens SET consumed_at = now()
     WHERE user_id = ${user.id} AND consumed_at IS NULL`;

  // 256 bits. The raw token lives only in the email — the DB stores its hash.
  const raw = b64u(crypto.getRandomValues(new Uint8Array(32)));
  await sql`
    INSERT INTO magic_link_tokens (token_hash, user_id, expires_at, requested_ip)
    VALUES (${await sha256hex(raw)}, ${user.id},
            now() + interval '15 minutes', ${ip || null})`;

  const link = `${appUrl.replace(/\/$/, "")}/api/auth/verify?t=${raw}`;
  const send = sendMagicLink(norm, link);
  if (ctx?.waitUntil) ctx.waitUntil(send);
  else await send;

  return ok();
}

/**
 * Fixed-window counter, one upsert. Bypassable at the window boundary (6
 * requests across an edge instead of 3) — accepted: the cost is a couple of
 * extra emails to an address the requester already controls, and the response
 * is identical either way.
 */
async function underLimit(sql, key, limit) {
  const [row] = await sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start > now() - interval '15 minutes'
                   THEN rate_limits.count + 1 ELSE 1 END,
      window_start = CASE WHEN rate_limits.window_start > now() - interval '15 minutes'
                   THEN rate_limits.window_start ELSE now() END
    RETURNING count`;
  return row.count <= limit;
}

/** Neither table expires rows. ~1% of requests pay for the cleanup; no cron. */
function sweep(sql, ctx) {
  if (Math.random() > 0.01) return;
  const work = (async () => {
    try {
      await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
      await sql`DELETE FROM magic_link_tokens WHERE created_at < now() - interval '7 days'`;
    } catch (err) {
      console.error("[auth/request] sweep failed", err);
    }
  })();
  if (ctx?.waitUntil) ctx.waitUntil(work);
}

async function sendMagicLink(to, link) {
  const key = process.env.RESEND_API_KEY;

  // VERCEL_ENV, not NODE_ENV: NODE_ENV is "production" during a Vercel build
  // and would accidentally match. Undefined VERCEL_ENV means local only.
  const local = process.env.VERCEL_ENV === undefined;
  if (local && (!key || process.env.DEV_MAGIC_LINK_LOG === "1")) {
    console.log(`\n[auth] sign-in link for ${to}:\n${link}\n`);
    return;
  }
  if (!key) {
    console.error("[auth/request] RESEND_API_KEY is not set; link not sent");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to,
        subject: "Your sign-in link",
        text: `Sign in to your project dashboard:\n\n${link}\n\nThis link expires in 15 minutes and can be used once. If you requested several, use the most recent email.\n\nIf you didn't request this, you can ignore it.`,
        html: emailHtml(link),
      }),
    });
    if (!res.ok) console.error(`[auth/request] resend ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[auth/request] resend threw", err);
  }
}

const emailHtml = (link) => `<!doctype html>
<html><body style="margin:0;padding:32px;background:#070B14;font-family:-apple-system,Segoe UI,sans-serif;color:#E2E8F0">
  <div style="max-width:440px;margin:0 auto">
    <h1 style="margin:0 0 8px;font-size:18px;font-weight:600">Sign in to your dashboard</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#94A3B8">This link expires in 15 minutes and can be used once.</p>
    <a href="${link}" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;text-decoration:none">Open my dashboard</a>
    <p style="margin:24px 0 0;font-size:12px;color:#64748B;word-break:break-all">${link}</p>
    <p style="margin:16px 0 0;font-size:12px;color:#64748B">If you didn't request this, you can ignore this email.</p>
  </div>
</body></html>`;
