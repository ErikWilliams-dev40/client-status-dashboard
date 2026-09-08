import { useEffect } from "react";
import { colors, FONT_UI } from "../theme.js";
import { Icon, icons } from "./Icon.jsx";

const TONES = {
  success: { color: colors.green, icon: "check" },
  error: { color: colors.redSoft, icon: "alert" },
};

/**
 * Transient confirmation for admin writes. Fixed to the bottom of the viewport
 * so it never shifts the form it is reporting on.
 *
 * `role="status"` with aria-live polite: a save confirmation should be
 * announced, but not interrupt what a screen reader is already saying. Errors
 * stay until dismissed — an unread failure is worse than a stale toast.
 */
export function Toast({ toast, onDismiss }) {
  const autoDismiss = toast?.tone === "success";

  useEffect(() => {
    if (!toast || !autoDismiss) return;
    const id = setTimeout(onDismiss, 3200);
    return () => clearTimeout(id);
  }, [toast, autoDismiss, onDismiss]);

  if (!toast) return null;
  const tone = TONES[toast.tone] ?? TONES.success;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fade-in"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "calc(100vw - 32px)",
        padding: "11px 14px",
        borderRadius: 10,
        background: colors.bgCard,
        border: `1px solid ${tone.color}55`,
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
        fontFamily: FONT_UI,
        fontSize: 13,
        color: colors.textPrimary,
      }}
    >
      <Icon d={icons[tone.icon]} size={15} color={tone.color} />
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          display: "inline-flex",
          marginLeft: 4,
          padding: 2,
          border: 0,
          borderRadius: 4,
          background: "transparent",
          color: colors.textMuted,
          cursor: "pointer",
        }}
      >
        <Icon d={icons.x} size={13} color="currentColor" />
      </button>
    </div>
  );
}
