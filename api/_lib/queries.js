import { STATUS_IDS } from "../../src/lib/status.js";

/**
 * The one client-facing project read.
 *
 * SECURITY: scope comes from `user`, which is only ever built by requireUser()
 * from a verified session cookie. Never pass a client_id taken from a request
 * body or query string. Add new client-facing reads here so there is a single
 * place to audit.
 *
 * An owner has clientId === null and matches the role branch instead.
 *
 * `projectId` narrows to one row without weakening the scoping predicate — it is
 * ANDed with it, never substituted for it. It exists so api/admin.js can return
 * a mutated project in exactly the shape the dashboard already expects, rather
 * than growing a second project SELECT that would have to be audited separately.
 */
export async function listProjectsFor(sql, user, { projectId = null } = {}) {
  return sql`
    SELECT p.id, p.name, p.summary, p.status, p.phase_note, p.progress,
           p.sort_order, p.updated_at, p.client_id,
           c.name AS client_name,
           COALESCE(l.links,  '[]'::json) AS links,
           COALESCE(u.latest, '[]'::json) AS updates
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object(
               'id', pl.id, 'kind', pl.kind, 'label', pl.label, 'url', pl.url)
             ORDER BY pl.sort_order) AS links
      FROM project_links pl WHERE pl.project_id = p.id
    ) l ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object(
               'id', x.id, 'body', x.body, 'createdAt', x.created_at)
             ORDER BY x.created_at DESC) AS latest
      FROM (SELECT id, body, created_at FROM updates
             WHERE project_id = p.id ORDER BY created_at DESC LIMIT 10) x
    ) u ON TRUE
    WHERE p.archived_at IS NULL
      AND (${user.role} = 'owner' OR p.client_id = ${user.clientId})
      AND (${projectId}::uuid IS NULL OR p.id = ${projectId}::uuid)
    ORDER BY c.name, p.sort_order, p.created_at
  `;
}

/** Clients list, for the owner's admin dropdowns. Owner-only by construction. */
export async function listClients(sql) {
  return sql`SELECT id, name FROM clients ORDER BY name`;
}

/**
 * Client contacts, for the owner's ClientManager. Owner-only by construction:
 * it takes no scope argument, so there is no way to call it *as* a client — the
 * single caller is gated on user.role === 'owner' in api/data.js.
 *
 * Owners are excluded: the admin UI has no reason to list them, and it keeps
 * the "you cannot disable an owner" interlock in api/admin.js from looking like
 * an option the UI simply declines to offer.
 */
export async function listClientUsers(sql) {
  return sql`
    SELECT id, email, name, client_id, disabled_at, last_login_at
      FROM users WHERE role = 'client'
     ORDER BY email`;
}

/** Shape a users row for the wire. */
export function toUserDTO(r) {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    clientId: r.client_id,
    disabledAt: r.disabled_at ?? null,
    lastLoginAt: r.last_login_at ?? null,
  };
}

/** Shape a projects row for the wire. */
export function toProjectDTO(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    name: r.name,
    summary: r.summary,
    status: STATUS_IDS.includes(r.status) ? r.status : "queued",
    phaseNote: r.phase_note,
    progress: r.progress,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
    links: r.links ?? [],
    updates: r.updates ?? [],
  };
}
