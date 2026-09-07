import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { getLinkKind } from "../lib/status.js";
import { hostOf, linkLabel } from "../lib/format.js";
import { Icon, icons } from "./Icon.jsx";

/**
 * An outbound project link. Used on the dashboard card and in the detail view;
 * `showHost` adds the hostname underneath, which is too dense for a card.
 *
 * stopPropagation matters on the card, where this sits inside a clickable
 * container — without it, opening a link would also navigate into the project.
 */
export function LinkButton({ link, showHost = false }) {
  const kind = getLinkKind(link.kind);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "inline-flex",
        flexDirection: showHost ? "column" : "row",
        alignItems: showHost ? "flex-start" : "center",
        gap: showHost ? 2 : 6,
        padding: showHost ? "8px 12px" : "5px 10px",
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        color: colors.textSecondary,
        fontFamily: FONT_UI,
        fontSize: 12,
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon d={icons[kind.icon]} size={12} color="currentColor" />
        {linkLabel(link)}
      </span>
      {showHost && (
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 400, color: colors.textMuted }}>
          {hostOf(link.url)}
        </span>
      )}
    </a>
  );
}
