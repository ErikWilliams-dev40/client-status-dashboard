import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { Icon, icons } from "./Icon.jsx";

const controlStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  background: "rgba(7,11,20,0.6)",
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  fontFamily: FONT_UI,
  fontSize: 13,
  outline: "none",
};

/**
 * Labeled input / textarea / select. `as` picks the control; `icon` renders a
 * leading glyph inside an input.
 */
export function Field({ label, hint, as = "input", icon, options, style, ...rest }) {
  const Control = as === "textarea" ? "textarea" : as === "select" ? "select" : "input";
  const pad = icon ? { paddingLeft: 36 } : null;

  return (
    <label style={{ display: "block" }}>
      {label && (
        <span
          style={{
            display: "block",
            marginBottom: 6,
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: colors.textMuted,
          }}
        >
          {label}
        </span>
      )}
      <span style={{ position: "relative", display: "block" }}>
        {icon && (
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              display: "inline-flex",
              pointerEvents: "none",
            }}
          >
            <Icon d={icons[icon]} size={15} color={colors.textMuted} />
          </span>
        )}
        <Control
          style={{
            ...controlStyle,
            ...pad,
            ...(as === "textarea" ? { minHeight: 96, resize: "vertical" } : null),
            ...style,
          }}
          {...rest}
        >
          {as === "select"
            ? options?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))
            : undefined}
        </Control>
      </span>
      {hint && (
        <span style={{ display: "block", marginTop: 6, fontSize: 12, color: colors.textMuted }}>
          {hint}
        </span>
      )}
    </label>
  );
}
