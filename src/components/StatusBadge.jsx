import { colors, FONT_UI } from "../theme.js";
import { getStatus } from "../lib/status.js";
import { Icon, icons } from "./Icon.jsx";

const SIZES = {
  sm: { padding: "3px 8px", fontSize: 11, icon: 11 },
  md: { padding: "4px 10px", fontSize: 12, icon: 13 },
};

/**
 * The status pill. Always resolved through getStatus(), which falls back to
 * `queued`, so a stale or unknown id can never crash a view.
 *
 * `building` and `review` carry pulse: true — the animation goes on the icon
 * only, since a pulsing text label is hard to read. styles.css already disables
 * it under prefers-reduced-motion.
 */
export function StatusBadge({ status, size = "md", showHint = false }) {
  const s = getStatus(status);
  const dim = SIZES[size] ?? SIZES.md;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        title={s.hint}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: dim.padding,
          borderRadius: 999,
          background: `${s.color}1F`,
          border: `1px solid ${s.color}66`,
          color: s.color,
          fontFamily: FONT_UI,
          fontSize: dim.fontSize,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <span className={s.pulse ? "pulse" : undefined} style={{ display: "inline-flex" }}>
          <Icon d={icons[s.icon]} size={dim.icon} color={s.color} />
        </span>
        {s.label}
      </span>
      {showHint && (
        <span style={{ fontFamily: FONT_UI, fontSize: 12, color: colors.textMuted }}>
          {s.hint}
        </span>
      )}
    </span>
  );
}
