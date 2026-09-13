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
  className = "",
  ...rest
}) {
  const off = disabled || loading;
  return (
    <button
      type="button"
      disabled={off}
      className={`button button-${variant} ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 40,
        padding: "9px 15px",
        width: full ? "100%" : undefined,
        borderRadius: 10,
        fontFamily: FONT_UI,
        fontSize: 13,
        fontWeight: 600,
        cursor: off ? "not-allowed" : "pointer",
        opacity: off ? 0.55 : 1,
        boxShadow: variant === "primary" ? "0 1px 2px rgba(15,23,42,.12)" : undefined,
        transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease",
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
      <span className="button-label">{children}</span>
    </button>
  );
}
