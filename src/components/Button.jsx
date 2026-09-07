import { colors, FONT_UI } from "../theme.js";
import { Icon, icons } from "./Icon.jsx";

const VARIANTS = {
  primary: { background: colors.blue, color: "#fff", border: `1px solid ${colors.blue}` },
  ghost: {
    background: "transparent",
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
  },
  danger: {
    background: "transparent",
    color: colors.redSoft,
    border: `1px solid ${colors.red}55`,
  },
};

export function Button({
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  full = false,
  children,
  style,
  ...rest
}) {
  const off = disabled || loading;
  return (
    <button
      type="button"
      disabled={off}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 16px",
        width: full ? "100%" : undefined,
        borderRadius: 8,
        fontFamily: FONT_UI,
        fontSize: 13,
        fontWeight: 600,
        cursor: off ? "not-allowed" : "pointer",
        opacity: off ? 0.55 : 1,
        transition: "opacity 0.15s ease, border-color 0.15s ease",
        ...VARIANTS[variant],
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span className="spin" style={{ display: "inline-flex" }}>
          <Icon d={icons.refresh} size={14} color="currentColor" />
        </span>
      ) : (
        icon && <Icon d={icons[icon]} size={14} color="currentColor" />
      )}
      {children}
    </button>
  );
}
