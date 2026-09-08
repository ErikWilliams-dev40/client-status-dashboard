import { json } from "./_lib/db.js";
import { originOk, requireUser } from "./_lib/auth.js";
import { listProjectsFor, toProjectDTO } from "./_lib/queries.js";
import { LINK_KIND_IDS, STATUS_IDS } from "../src/lib/status.js";

export const config = { runtime: "edge" };

/**
 * POST -> every owner-only write, dispatched on `action`.
 *
 * One endpoint rather than a tree of routes: the authorization, CSRF, and
 * error-mapping preamble is identical for every write, and Vercel bills per
 * function. Scope is not a concern here the way it is on the read side — the
 * owner is the only caller — but every id in a body is still validated by
 * joining the table it names rather than trusted.
 *
 * The Neon HTTP driver has no interactive transactions, so the two writes that
 * must be atomic (`project.links.set`, `update.post`) are single CTE statements.
 */
export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Cheap check first: it costs no DB round trip.
  if (!originOk(req)) return json({ error: "forbidden" }, 403);

  const { user, sql, error } = await requireUser(req, { role: "owner" });
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request", message: "Body must be JSON." }, 400);
  }

  const action = body?.action;
  // hasOwn, not `ACTIONS[action]`: otherwise "constructor" and friends dispatch.
  if (typeof action !== "string" || !Object.hasOwn(ACTIONS, action)) {
    return json({ error: "unknown_action", field: "action" }, 400);
  }

  try {
    return await ACTIONS[action]({ sql, user, body });
  } catch (err) {
    return errorResponse(err);
  }
}

// ---------------------------------------------------------------- validation

/** Thrown by the helpers below; the dispatcher turns it into a 400. */
class Invalid extends Error {
  constructor(field, message) {
    super(message);
    this.name = "Invalid";
    this.field = field;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same deliberately-permissive shape as api/auth/request.js. Copied rather than
// imported: a handler shouldn't import from another handler. There it is an
// enumeration-defense decision; here it is only input hygiene.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/** Required non-empty string, trimmed, length checked after trimming. */
function str(v, field, { max = 200 } = {}) {
  if (typeof v !== "string") throw new Invalid(field, "Expected a string.");
  const t = v.trim();
  if (!t) throw new Invalid(field, "This can't be empty.");
  if (t.length > max) throw new Invalid(field, `Keep this under ${max} characters.`);
  return t;
}

/** Optional string; empty/absent becomes null so a nullable column can be cleared. */
function optStr(v, field, { max = 200 } = {}) {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new Invalid(field, "Expected a string.");
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) throw new Invalid(field, `Keep this under ${max} characters.`);
  return t;
}

/**
 * Without this a junk id reaches `::uuid` and Postgres raises 22P02, which is a
 * 500 unless mapped. Cheaper and clearer to reject it here.
 */
function uuid(v, field) {
  if (typeof v !== "string" || !UUID_RE.test(v)) throw new Invalid(field, "Not a valid id.");
  return v;
}

/** Integer only — no coercion from "5", so a form bug surfaces instead of silently working. */
function int(v, field, { min, max }) {
  if (!Number.isInteger(v)) throw new Invalid(field, "Expected a whole number.");
  if (v < min || v > max) throw new Invalid(field, `Must be between ${min} and ${max}.`);
  return v;
}

function oneOf(v, field, allowed) {
  if (!allowed.includes(v)) throw new Invalid(field, "Not a recognized value.");
  return v;
}

/**
 * The real URL gate. projects_links_url_chk is `url ~ '^https://'`, which is
 * unanchored at the end and so admits whitespace and control characters; this
 * runs first and the constraint is defense in depth.
 */
function httpsUrl(v, field) {
  const t = str(v, field, { max: 2048 });
  if (/[\s\u0000-\u001f\u007f]/.test(t)) {
    throw new Invalid(field, "Links can't contain spaces or control characters.");
  }
  let parsed;
  try {
    parsed = new URL(t);
  } catch {
    throw new Invalid(field, "That isn't a valid URL.");
  }
  if (parsed.protocol !== "https:") throw new Invalid(field, "Links must start with https://.");
  return t;
}

function email(v, field) {
  const t = str(v, field, { max: 320 });
  if (!EMAIL_RE.test(t)) throw new Invalid(field, "That isn't a valid email address.");
  return t;
}

const has = (body, key) => Object.hasOwn(body, key);

// ------------------------------------------------------------- error mapping

const CONSTRAINT_FIELDS = {
  users_scope_chk: "clientId",
  projects_status_chk: "status",
  projects_progress_chk: "progress",
  project_links_url_chk: "links",
  project_links_kind_chk: "links",
};

/**
 * Turn a driver error into something the UI can render.
 *
 * Never echo err.message or err.detail: `detail` on a unique violation contains
 * the conflicting row's values.
 */
function errorResponse(err) {
  if (err instanceof Invalid) {
    return json({ error: "invalid_request", field: err.field, message: err.message }, 400);
  }

  const code = err?.code;
  const constraint = err?.constraint;

  if (code === "23505" && constraint === "users_email_norm_key") {
    return json(
      { error: "email_taken", field: "email", message: "That address already has access." },
      409,
    );
  }
  if (code === "23514" && Object.hasOwn(CONSTRAINT_FIELDS, constraint)) {
    return json(
      { error: "invalid_request", field: CONSTRAINT_FIELDS[constraint], message: "Not allowed." },
      400,
    );
  }
  if (code === "23503") return json({ error: "not_found" }, 404);
  // 22P02 invalid text representation, 22003 numeric out of range.
  if (code === "22P02" || code === "22003") {
    return json({ error: "invalid_request", message: "Malformed value." }, 400);
  }

  console.error("[admin]", err);
  return json({ error: "server_error" }, 500);
}

const notFound = (field) => json({ error: "not_found", ...(field ? { field } : {}) }, 404);

/**
 * Re-read a project through the one authorized project query so the admin
 * response and the dashboard payload can never drift in shape.
 */
async function projectDTO(sql, user, projectId) {
  const rows = await listProjectsFor(sql, user, { projectId });
  return rows[0] ? toProjectDTO(rows[0]) : null;
}

// ------------------------------------------------------------------- actions

const ACTIONS = Object.freeze({
  "client.create": async ({ sql, body }) => {
    const name = str(body.name, "name", { max: 120 });
    const [row] = await sql`INSERT INTO clients (name) VALUES (${name}) RETURNING id, name`;
    return json({ ok: true, client: row });
  },

  "client.rename": async ({ sql, body }) => {
    const id = uuid(body.clientId, "clientId");
    const name = str(body.name, "name", { max: 120 });
    const [row] = await sql`
      UPDATE clients SET name = ${name} WHERE id = ${id}::uuid RETURNING id, name`;
    return row ? json({ ok: true, client: row }) : notFound("clientId");
  },

  /**
   * Create a client contact. `role` is a SQL literal and is never read from the
   * body, which is what makes users_scope_chk structurally unreachable.
   *
   * Sends no email — the invitee signs in through the normal LoginView flow,
   * which is where the rate limiting and the Resend config already live.
   */
  "user.invite": async ({ sql, body }) => {
    const clientId = uuid(body.clientId, "clientId");
    const addr = email(body.email, "email");
    const name = optStr(body.name, "name", { max: 120 });

    // INSERT ... SELECT FROM clients: a bad clientId yields zero rows rather
    // than a foreign-key violation, so it reports as a clean 404.
    const [row] = await sql`
      INSERT INTO users (email, email_norm, name, role, client_id)
      SELECT ${addr}, ${addr.toLowerCase()}, ${name}, 'client', c.id
        FROM clients c WHERE c.id = ${clientId}::uuid
      RETURNING id, email, name, client_id, disabled_at`;
    return row ? json({ ok: true, user: toUserDTO(row) }) : notFound("clientId");
  },

  "user.disable": ({ sql, body }) => setDisabled(sql, body, true),
  "user.enable": ({ sql, body }) => setDisabled(sql, body, false),

  "project.create": async ({ sql, user, body }) => {
    const clientId = uuid(body.clientId, "clientId");
    const name = str(body.name, "name", { max: 160 });
    const summary = optStr(body.summary, "summary", { max: 400 });
    const status = has(body, "status") ? oneOf(body.status, "status", STATUS_IDS) : "queued";
    const phaseNote = optStr(body.phaseNote, "phaseNote", { max: 200 });
    const progress = has(body, "progress") ? int(body.progress, "progress", { min: 0, max: 100 }) : 0;
    const sortOrder = has(body, "sortOrder")
      ? int(body.sortOrder, "sortOrder", { min: -9999, max: 9999 })
      : 0;

    const [row] = await sql`
      INSERT INTO projects (client_id, name, summary, status, phase_note, progress, sort_order)
      SELECT c.id, ${name}, ${summary}, ${status}, ${phaseNote}, ${progress}, ${sortOrder}
        FROM clients c WHERE c.id = ${clientId}::uuid
      RETURNING id`;
    if (!row) return notFound("clientId");
    return json({ ok: true, project: await projectDTO(sql, user, row.id) });
  },

  /**
   * Partial patch. COALESCE(${v}, col) is wrong here because it cannot express
   * "clear this field", which summary and phase_note both need. One presence
   * flag per column instead, in a single fixed-shape statement — never built by
   * string concatenation.
   */
  "project.update": async ({ sql, user, body }) => {
    const id = uuid(body.projectId, "projectId");

    const f = {
      name: has(body, "name"),
      summary: has(body, "summary"),
      status: has(body, "status"),
      phaseNote: has(body, "phaseNote"),
      progress: has(body, "progress"),
      sortOrder: has(body, "sortOrder"),
    };
    if (!Object.values(f).some(Boolean)) {
      throw new Invalid("body", "Nothing to update.");
    }

    const name = f.name ? str(body.name, "name", { max: 160 }) : null;
    const summary = f.summary ? optStr(body.summary, "summary", { max: 400 }) : null;
    const status = f.status ? oneOf(body.status, "status", STATUS_IDS) : null;
    const phaseNote = f.phaseNote ? optStr(body.phaseNote, "phaseNote", { max: 200 }) : null;
    const progress = f.progress ? int(body.progress, "progress", { min: 0, max: 100 }) : null;
    const sortOrder = f.sortOrder
      ? int(body.sortOrder, "sortOrder", { min: -9999, max: 9999 })
      : null;

    // A drag-reorder must not make every card read "Updated just now".
    const touch = f.name || f.summary || f.status || f.phaseNote || f.progress;

    const [row] = await sql`
      UPDATE projects SET
        name       = CASE WHEN ${f.name}      THEN ${name}::text       ELSE name       END,
        summary    = CASE WHEN ${f.summary}   THEN ${summary}::text    ELSE summary    END,
        status     = CASE WHEN ${f.status}    THEN ${status}::text     ELSE status     END,
        phase_note = CASE WHEN ${f.phaseNote} THEN ${phaseNote}::text  ELSE phase_note END,
        progress   = CASE WHEN ${f.progress}  THEN ${progress}::int    ELSE progress   END,
        sort_order = CASE WHEN ${f.sortOrder} THEN ${sortOrder}::int   ELSE sort_order END,
        updated_at = CASE WHEN ${touch}       THEN now()               ELSE updated_at END
      WHERE id = ${id}::uuid AND archived_at IS NULL
      RETURNING id`;
    if (!row) return notFound("projectId");
    return json({ ok: true, project: await projectDTO(sql, user, row.id) });
  },

  "project.archive": ({ sql, body }) => setArchived(sql, body, true),
  "project.unarchive": ({ sql, user, body }) => setArchived(sql, body, false, { sql, user }),

  /**
   * Replace the whole link set atomically.
   *
   * Two things worth knowing about this statement: a data-modifying CTE runs
   * whether or not the outer query references it, which is what makes the
   * "clear every link" path work with an empty array; and `found` has to be
   * selected separately, because otherwise "no such project" and "this project
   * now has no links" both come back as [] and the 404 would be reported as 200.
   *
   * Rows are deleted and reinserted, so every link gets a new id — the caller
   * replaces its links array wholesale.
   */
  "project.links.set": async ({ sql, body }) => {
    const id = uuid(body.projectId, "projectId");
    if (!Array.isArray(body.links)) throw new Invalid("links", "Expected a list of links.");
    if (body.links.length > MAX_LINKS) {
      throw new Invalid("links", `At most ${MAX_LINKS} links per project.`);
    }

    // Validate every element before touching the DB, so a bad element in
    // position 7 can't leave a half-applied set behind.
    const rows = body.links.map((l, i) => ({
      kind: oneOf(l?.kind, "links", LINK_KIND_IDS),
      label: optStr(l?.label, "links", { max: 60 }),
      url: httpsUrl(l?.url, "links"),
      sort_order: i, // index-derived; any client-supplied order is ignored
    }));

    const [res] = await sql`
      WITH proj AS (
        SELECT id FROM projects WHERE id = ${id}::uuid
      ), del AS (
        DELETE FROM project_links WHERE project_id IN (SELECT id FROM proj)
      ), ins AS (
        INSERT INTO project_links (project_id, kind, label, url, sort_order)
        SELECT proj.id, x.kind, x.label, x.url, x.sort_order
          FROM proj, json_to_recordset(${JSON.stringify(rows)}::json)
               AS x(kind text, label text, url text, sort_order int)
        RETURNING id, kind, label, url, sort_order
      )
      SELECT (SELECT count(*) FROM proj) AS found,
             (SELECT COALESCE(json_agg(json_build_object(
                       'id', id, 'kind', kind, 'label', label, 'url', url)
                     ORDER BY sort_order), '[]'::json) FROM ins) AS links`;

    if (Number(res.found) === 0) return notFound("projectId");
    // projectId is echoed so the caller can patch the right project's links
    // without having to remember which request this response belongs to.
    return json({ ok: true, projectId: id, links: res.links });
  },

  /**
   * Post an update and optionally move the status, in one statement.
   *
   * Atomic without a transaction because `ins` selects from `proj`: if the
   * WHERE matches nothing, `proj` yields no rows, `ins` inserts none, and the
   * whole thing is a no-op. There is no interleaving in which the status moves
   * but the changelog row is missing.
   *
   * status_at_time records the status AFTER the write. The column renders as
   * the badge beside the update in the client's timeline, so an update that
   * announces "we've moved into review" has to be stamped `review` — not the
   * `building` it superseded. (A sibling plain-SELECT CTE would see the
   * pre-statement snapshot if the other reading were ever wanted.)
   */
  "update.post": async ({ sql, user, body }) => {
    const id = uuid(body.projectId, "projectId");
    const text = str(body.body, "body", { max: 4000 });
    const status = has(body, "status") ? oneOf(body.status, "status", STATUS_IDS) : null;

    const [row] = await sql`
      WITH proj AS (
        UPDATE projects
           SET status     = COALESCE(${status}::text, status),
               updated_at = now()
         WHERE id = ${id}::uuid AND archived_at IS NULL
        RETURNING id, status, updated_at
      ), ins AS (
        INSERT INTO updates (project_id, body, status_at_time, author_id)
        SELECT proj.id, ${text}::text, proj.status, ${user.id}::uuid FROM proj
        RETURNING id, body, status_at_time, created_at
      )
      SELECT ins.id, ins.body, ins.status_at_time, ins.created_at,
             proj.status, proj.updated_at
        FROM ins CROSS JOIN proj`;

    if (!row) return notFound("projectId");
    return json({
      ok: true,
      update: {
        id: row.id,
        body: row.body,
        statusAtTime: row.status_at_time,
        createdAt: row.created_at,
      },
      project: await projectDTO(sql, user, id),
    });
  },
});

const MAX_LINKS = 10;

const toUserDTO = (r) => ({
  id: r.id,
  email: r.email,
  name: r.name,
  clientId: r.client_id,
  disabledAt: r.disabled_at ?? null,
});

/**
 * `AND role = 'client'` is the interlock: the owner cannot disable themselves,
 * so there is no way to lock the only admin out of the app. requireUser()
 * re-reads the user row on every request, so a disabled client is locked out on
 * their very next call.
 */
async function setDisabled(sql, body, disabled) {
  const id = uuid(body.userId, "userId");
  // Two statements rather than an interpolated now(): the tagged template turns
  // every ${} into a bound parameter, so SQL cannot be spliced in that way.
  const [row] = disabled
    ? await sql`
        UPDATE users SET disabled_at = COALESCE(disabled_at, now())
         WHERE id = ${id}::uuid AND role = 'client'
        RETURNING id, email, name, client_id, disabled_at`
    : await sql`
        UPDATE users SET disabled_at = NULL
         WHERE id = ${id}::uuid AND role = 'client'
        RETURNING id, email, name, client_id, disabled_at`;
  return row ? json({ ok: true, user: toUserDTO(row) }) : notFound("userId");
}

/**
 * COALESCE rather than `WHERE archived_at IS NULL` so the write is idempotent
 * and zero rows unambiguously means "no such project".
 *
 * An archived project drops out of listProjectsFor, so archive returns only the
 * id and the caller removes it from state; unarchive can return the full DTO.
 */
async function setArchived(sql, body, archived, dto) {
  const id = uuid(body.projectId, "projectId");
  const [row] = archived
    ? await sql`
        UPDATE projects SET archived_at = COALESCE(archived_at, now()), updated_at = now()
         WHERE id = ${id}::uuid RETURNING id, archived_at`
    : await sql`
        UPDATE projects SET archived_at = NULL, updated_at = now()
         WHERE id = ${id}::uuid RETURNING id, archived_at`;

  if (!row) return notFound("projectId");
  if (archived) return json({ ok: true, id: row.id, archivedAt: row.archived_at });
  return json({ ok: true, project: await projectDTO(dto.sql, dto.user, row.id) });
}
