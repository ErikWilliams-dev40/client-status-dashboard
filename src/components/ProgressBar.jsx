import { colors, FONT_MONO } from "../theme.js";

/**
 * Progress track, tinted with the project's status color. Rendered even at 0 —
 * an empty track still says "this is tracked, and it hasn't started".
 */
export function ProgressBar({ value, color, label, height = 6, hideValue = false }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          flex: 1,
          height,
          borderRadius: height / 2,
          background: colors.border,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: height / 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      {!hideValue && <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: colors.textMuted }}>{pct}%</span>}
    </div>
  );
}
