import { colors, FONT_UI, FONT_MONO } from "./theme.js";
import { Icon, icons } from "./components/Icon.jsx";

// Phase 0 placeholder. Replaced in Phase 3/4 by the real
// login -> dashboard flow.
export default function App() {
  return (
    <div
      className="grid-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bgBase,
        fontFamily: FONT_UI,
      }}
    >
      <div className="card fade-in" style={{ padding: 32, textAlign: "center", maxWidth: 420 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            margin: "0 auto 16px",
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(135deg, ${colors.blue}, ${colors.indigo})`,
          }}
        >
          <Icon d={icons.layers} size={20} color="#fff" />
        </div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
          Project Status
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: colors.textSecondary }}>
          Setting things up.
        </p>
        <p style={{ margin: "16px 0 0", fontSize: 11, fontFamily: FONT_MONO, color: colors.textMuted }}>
          phase 0 &middot; shell
        </p>
      </div>
    </div>
  );
}
