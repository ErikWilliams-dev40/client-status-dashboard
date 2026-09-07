import { colors, FONT_UI } from "../theme.js";
import { Icon, icons } from "./Icon.jsx";

/** Centred placeholder for "nothing here yet" and "not found". */
export function EmptyState({ icon = "layers", title, body, action }) {
  return (
    <div
      className="card"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        fontFamily: FONT_UI,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${colors.border}55`,
          marginBottom: 14,
        }}
      >
        <Icon d={icons[icon]} size={20} color={colors.textMuted} />
      </span>

      <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>{title}</div>

      {body && (
        <p
          style={{
            margin: "8px auto 0",
            maxWidth: 360,
            fontSize: 13,
            lineHeight: 1.6,
            color: colors.textSecondary,
          }}
        >
          {body}
        </p>
      )}

      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
