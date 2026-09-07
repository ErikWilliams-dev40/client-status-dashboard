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
          background: "rgba(7,11,20,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 20px",
            minHeight: 60,
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
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${colors.blue}, ${colors.indigo})`,
              }}
            >
              <Icon d={icons.layers} size={16} color="#fff" />
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
              Project Status
            </span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="hide-sm" style={{ textAlign: "right", lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, color: colors.textSecondary }}>{who}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: colors.textMuted }}>
                {user?.role}
              </div>
            </div>
            {right}
            <Button variant="ghost" icon="log_out" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 64px" }}>
        {children}
      </main>
    </div>
  );
}
