// Stateless signed-session primitives. Edge-compatible: Web Crypto only, no
// node: imports, no dependencies.
//
// There is one token type, one algorithm, one secret. Signatures are compared
// with crypto.subtle.verify, which is constant-time by construction — never
// compare signature strings with ===.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SESSION_COOKIE = "__Host-session";
export const SESSION_TTL_S = 60 * 60 * 24 * 14; // 14 days

export const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const unb64u = (s) => {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** hex(sha256(input)). Magic link tokens are stored as this, never raw. */
export async function sha256hex(input) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let keyPromise;
function hmacKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  keyPromise ??= crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return keyPromise;
}

export async function signSession(payload) {
  const body = b64u(
    enc.encode(
      JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S }),
    ),
  );
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body));
  return `${body}.${b64u(sig)}`;
}

/** Returns the payload, or null. Never throws. */
export async function verifySession(token) {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  let ok;
  try {
    // subtle.verify is constant-time — do NOT compare strings here.
    ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      unb64u(token.slice(dot + 1)),
      enc.encode(body),
    );
  } catch {
    return null;
  }
  if (!ok) return null;
  let p;
  try {
    p = JSON.parse(dec.decode(unb64u(body)));
  } catch {
    return null;
  }
  if (!p?.exp || p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

// __Host- forces Secure + Path=/ and forbids a Domain attribute, so a sibling
// subdomain cannot inject a session. Chrome and Firefox accept Secure cookies
// on http://localhost, so dev works unchanged.
//
// SameSite=Lax, not Strict: the user arrives from their mail client via a
// cross-site top-level navigation, and Strict would withhold the cookie on
// that first landing — they'd appear logged out right after logging in.
export const sessionCookie = (token, maxAge = SESSION_TTL_S) =>
  `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

export const clearCookie = () => sessionCookie("", 0);

export function readCookie(req, name) {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
