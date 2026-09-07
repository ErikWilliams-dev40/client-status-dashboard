import { useEffect, useState } from "react";
import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { Icon, icons } from "../components/Icon.jsx";
import { Button } from "../components/Button.jsx";
import { Field } from "../components/Field.jsx";
import { requestMagicLink } from "../lib/api.js";

const RESEND_AFTER_MS = 30_000;

/**
 * Invite-only sign-in. On submit this ALWAYS swaps to the same confirmation
 * panel — it never branches on the response, so the screen reveals nothing
 * about whether the address has access.
 */
export function LoginView({ notice }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (!sent) return;
    setCanRetry(false);
    const t = setTimeout(() => setCanRetry(true), RESEND_AFTER_MS);
    return () => clearTimeout(t);
  }, [sent]);

  async function submit(e) {
    e.preventDefault();
    if (sending || !email.trim()) return;
    setSending(true);
    try {
      await requestMagicLink(email.trim());
    } catch {
      // Deliberately swallowed: a network or server error must look exactly
      // like a success, or the form becomes an account oracle.
    }
    setSending(false);
    setSent(true);
  }

  return (
    <div
      className="grid-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: colors.bgBase,
        fontFamily: FONT_UI,
      }}
    >
      <div className="card fade-in glow-blue" style={{ padding: 32, width: "100%", maxWidth: 400 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            marginBottom: 20,
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(135deg, ${colors.blue}, ${colors.indigo})`,
          }}
        >
          <Icon d={icons.layers} size={20} color="#fff" />
        </div>

        {notice && (
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "10px 12px",
              marginBottom: 20,
              borderRadius: 8,
              background: `${colors.amber}1F`,
              border: `1px solid ${colors.amber}66`,
              fontSize: 12,
              lineHeight: 1.5,
              color: colors.textPrimary,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              <Icon d={icons.alert} size={14} color={colors.amber} />
            </span>
            {notice}
          </div>
        )}

        {sent ? (
          <>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
              Check your inbox
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                lineHeight: 1.6,
                color: colors.textSecondary,
              }}
            >
              If that email has access, a sign-in link is on its way. It expires in 15 minutes. If
              you requested more than one, use the most recent email.
            </p>
            <div style={{ marginTop: 24 }}>
              <Button
                variant="ghost"
                icon="arrow_right"
                full
                disabled={!canRetry}
                onClick={() => setSent(false)}
              >
                {canRetry ? "Use a different email" : "You can try again in a moment"}
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
              Project Status
            </h1>
            <p style={{ margin: "8px 0 24px", fontSize: 13, color: colors.textSecondary }}>
              Enter the email your projects are shared with.
            </p>

            <Field
              label="Email"
              icon="mail"
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div style={{ marginTop: 20 }}>
              <Button type="submit" icon="arrow_right" full loading={sending}>
                Send me a sign-in link
              </Button>
            </div>

            <p
              style={{
                margin: "20px 0 0",
                fontFamily: FONT_MONO,
                fontSize: 11,
                lineHeight: 1.6,
                color: colors.textMuted,
              }}
            >
              Access is invite-only. No password to remember.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
