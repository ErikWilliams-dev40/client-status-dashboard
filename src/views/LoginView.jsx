import { useEffect, useState } from "react";
import { colors, FONT_UI } from "../theme.js";
import { Icon, icons } from "../components/Icon.jsx";
import { Button } from "../components/Button.jsx";
import { Field } from "../components/Field.jsx";
import { requestMagicLink } from "../lib/api.js";

const RESEND_AFTER_MS = 30_000;

export function LoginView({ notice }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (!sent) return;
    setCanRetry(false);
    const timer = setTimeout(() => setCanRetry(true), RESEND_AFTER_MS);
    return () => clearTimeout(timer);
  }, [sent]);

  async function submit(event) {
    event.preventDefault();
    if (sending || !email.trim()) return;
    setSending(true);
    try {
      await requestMagicLink(email.trim());
    } catch {
      // The result remains intentionally identical for all addresses and failures.
    }
    setSending(false);
    setSent(true);
  }

  return (
    <main className="grid-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: colors.bgBase, fontFamily: FONT_UI }}>
      <div className="auth-layout card glow-blue fade-in">
        <section className="auth-story" aria-label="About this portal">
          <Brand inverted />
          <div style={{ marginTop: 84, maxWidth: 420 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#BFDBFE" }}>One clear source of truth</div>
            <h1 style={{ margin: "14px 0 18px", fontSize: 38, lineHeight: 1.12, letterSpacing: "-.035em" }}>
              Know exactly where your project stands.
            </h1>
            <p style={{ margin: 0, color: "#DBEAFE", fontSize: 15, lineHeight: 1.75 }}>
              Progress, decisions, recent updates, and important links—all in one private workspace.
            </p>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 56, color: "#DBEAFE", fontSize: 12 }}>
            <TrustItem icon="shield" label="Private access" />
            <TrustItem icon="activity" label="Live progress" />
          </div>
        </section>

        <section className="auth-form">
          <div className="mobile-brand"><Brand /></div>
          {notice && <Notice>{notice}</Notice>}
          {sent ? (
            <div aria-live="polite">
              <span style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 14, background: "#ECFDF5", marginBottom: 22 }}>
                <Icon d={icons.mail} size={22} color={colors.green} />
              </span>
              <div className="eyebrow">Link requested</div>
              <h2 style={{ margin: "8px 0 0", fontSize: 26, letterSpacing: "-.025em", color: colors.textPrimary }}>Check your inbox</h2>
              <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.7, color: colors.textSecondary }}>
                If <strong>{email}</strong> has access, a sign-in link is on its way. It expires in 15 minutes.
              </p>
              <div style={{ marginTop: 28 }}>
                <Button variant="ghost" full disabled={!canRetry} onClick={() => setSent(false)}>
                  {canRetry ? "Use a different email" : "You can try again in a moment"}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="eyebrow">Welcome back</div>
              <h2 style={{ margin: "8px 0 0", fontSize: 28, letterSpacing: "-.03em", color: colors.textPrimary }}>Sign in to your portal</h2>
              <p style={{ margin: "10px 0 28px", fontSize: 14, lineHeight: 1.65, color: colors.textSecondary }}>
                We’ll email you a secure, one-time sign-in link. No password required.
              </p>
              <Field label="Work email" icon="mail" type="email" name="email" autoComplete="email" autoFocus required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div style={{ marginTop: 18 }}>
                <Button type="submit" icon="arrow_right" full loading={sending}>Email me a sign-in link</Button>
              </div>
              <p style={{ display: "flex", alignItems: "center", gap: 7, margin: "22px 0 0", fontSize: 12, color: colors.textMuted }}>
                <Icon d={icons.shield} size={13} color={colors.textMuted} /> Invite-only access. Your link can only be used once.
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function Brand({ inverted = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 11, background: inverted ? "rgba(255,255,255,.14)" : `linear-gradient(135deg, ${colors.blue}, ${colors.indigo})`, border: inverted ? "1px solid rgba(255,255,255,.18)" : 0 }}>
        <Icon d={icons.layers} size={18} color="#fff" />
      </span>
      <span style={{ color: inverted ? "#fff" : colors.textPrimary, fontSize: 15, fontWeight: 700 }}>Project Status</span>
    </div>
  );
}

function TrustItem({ icon, label }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon d={icons[icon]} size={14} color="#BFDBFE" />{label}</span>;
}

function Notice({ children }) {
  return (
    <div style={{ display: "flex", gap: 9, padding: "11px 12px", marginBottom: 24, borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 12, lineHeight: 1.55, color: colors.textSecondary }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><Icon d={icons.alert} size={14} color={colors.amber} /></span>
      {children}
    </div>
  );
}
