// Display formatting. Imports no React so it stays cheap to reuse anywhere.
import { getLinkKind } from "./status.js";

/**
 * The single date-parsing point.
 *
 * The two timestamps on a project arrive in different shapes: `updatedAt` is
 * parsed by the driver into an ISO string ("...T05:02:05.882Z"), while
 * `updates[].createdAt` is serialized by Postgres inside json_build_object
 * ("...T05:02:05.993288+00:00" — microsecond precision, sometimes a space
 * instead of the T). Normalize both and never hand a caller an Invalid Date.
 */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now" / "12m ago" / "5h ago" / "3d ago" / "6 Sep". */
export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return "";
  const ms = Date.now() - d.getTime();
  if (ms < 0) return "just now";
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ago`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h ago`;
  if (ms < 7 * DAY) return `${Math.floor(ms / DAY)}d ago`;
  return shortDate(d);
}

/** "6 Sep" — or "6 Sep 2025" when it isn't the current year. */
export function shortDate(value) {
  const d = toDate(value);
  if (!d) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? null : { year: "numeric" }),
  });
}

/** Full timestamp, for the title= tooltip next to every relative time. */
export function absoluteTime(value) {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "acme.com" from "https://www.acme.com/path". */
export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url ?? "";
  }
}

/**
 * A link's display label. `label` is nullable in the schema, so both the
 * dashboard card and the detail view need this fallback — it lives here so the
 * two can't drift apart.
 */
export const linkLabel = (link) => link?.label ?? getLinkKind(link?.kind).label;

export const pluralize = (n, one, many) => `${n} ${n === 1 ? one : many}`;
