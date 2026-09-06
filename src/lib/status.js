import { colors } from "../theme.js";

// Imports no React on purpose: api/ handlers import STATUS_IDS from here.
// `icon` is a key into `icons` in src/components/Icon.jsx, resolved by the
// component layer so this module stays server-safe.
//
// KEEP IN SYNC with projects_status_chk in db/schema.sql.
export const STATUSES = [
  { id: "queued",    label: "Queued",      color: colors.textMuted, icon: "clock",  hint: "Scheduled, not started yet" },
  { id: "discovery", label: "Discovery",   color: colors.indigo,    icon: "search", hint: "Scoping and requirements" },
  { id: "design",    label: "Design",      color: colors.purple,    icon: "layers", hint: "Wireframes and visual design" },
  { id: "building",  label: "In Build",    color: colors.blue,      icon: "code",   hint: "Actively being developed", pulse: true },
  { id: "review",    label: "Your Review", color: colors.amber,     icon: "user",   hint: "Waiting on your feedback", pulse: true },
  { id: "blocked",   label: "Blocked",     color: colors.red,       icon: "alert",  hint: "Waiting on something external" },
  { id: "live",      label: "Live",        color: colors.green,     icon: "rocket", hint: "Shipped to production" },
];

export const STATUS_IDS = STATUSES.map((s) => s.id);

const BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]));
export const getStatus = (id) => BY_ID[id] ?? BY_ID.queued;

/** Statuses that mean the ball is in someone's court. */
export const NEEDS_ATTENTION = ["review", "blocked"];

// Link kinds, shared by the card buttons and the admin editor.
export const LINK_KINDS = [
  { id: "live",    label: "Live",    icon: "globe" },
  { id: "staging", label: "Staging", icon: "external" },
  { id: "repo",    label: "Repo",    icon: "git" },
  { id: "docs",    label: "Docs",    icon: "file" },
  { id: "other",   label: "Link",    icon: "arrow_right" },
];
export const LINK_KIND_IDS = LINK_KINDS.map((k) => k.id);
const LINK_BY_ID = Object.fromEntries(LINK_KINDS.map((k) => [k.id, k]));
export const getLinkKind = (id) => LINK_BY_ID[id] ?? LINK_BY_ID.other;
