import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { Icon, icons } from "./Icon.jsx";
import { Button } from "./Button.jsx";

/**
 * The signed-in chrome. Wraps every authenticated view, once, outside the route
 * switch — so navigating between the dashboard and a project doesn't remount it.
 *
 * Holds no view logic and reads no data. `right` is a slot for view-level
 * actions; Phase 5 hangs the Admin link there.
 */
export function Shell({ user, onSignOut, onHome, right, children }) {
  const who = user?.name ?? user?.email ?? "";

  return (
    <div
      className="grid-bg"
      style={{ minHeight: "100vh", background: colors.bgBase, fontFamily: FONT_UI }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${colors.border}`,
          background: "rgba(255,255,255,.88)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 20px",
            minHeight: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <button
            type="button"
            onClick={onHome}
            title="Back to all projects"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: FONT_UI,
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 11,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${colors.blue}, ${colors.indigo})`,
                boxShadow: "0 6px 16px rgba(37,99,235,.22)",
              }}
            >
              <Icon d={icons.layers} size={16} color="#fff" />
            </span>
            <span style={{ textAlign: "left", lineHeight: 1.2 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
                Project Status
              </span>
              <span className="hide-sm" style={{ display: "block", marginTop: 2, fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: colors.textMuted }}>
                Client portal
              </span>
            </span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="hide-sm" style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: "50%", background: colors.bgSubtle, border: `1px solid ${colors.border}`, color: colors.blue, fontSize: 12, fontWeight: 700 }}>
                {(who || "U").slice(0, 1).toUpperCase()}
              </span>
              <span style={{ textAlign: "left", lineHeight: 1.3 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>{who}</span>
                <span style={{ display: "block", fontSize: 10, color: colors.textMuted }}>
                  {user?.role === "owner" ? "Workspace owner" : "Client access"}
                </span>
              </span>
            </div>
            {right}
            <Button className="shell-action" variant="ghost" icon="log_out" onClick={onSignOut} aria-label="Sign out">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 72px" }}>
        {children}
      </main>
    </div>
  );
}
