import { json } from "./_lib/db.js";
import { requireUser } from "./_lib/auth.js";
import {
  listClientUsers,
  listClients,
  listProjectsFor,
  toProjectDTO,
  toUserDTO,
} from "./_lib/queries.js";

export const config = { runtime: "edge" };

/**
 * GET -> the whole dashboard in one round trip.
 *
 * { user, projects[] } plus, for owner sessions only, clients[] for the admin
 * dropdowns. Project detail is a client-side selection from this payload.
 *
 * Scope comes from the session via requireUser(). No client_id is read from
 * the request.
 */
export default async function handler(req) {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const { user, sql, error } = await requireUser(req);
  if (error) return error;

  const rows = await listProjectsFor(sql, user);
  const body = {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    projects: rows.map(toProjectDTO),
  };
  // Owner-only extras for the admin screen. A client session never sees these
  // keys at all — not an empty array, which would still leak the count.
  if (user.role === "owner") {
    body.clients = await listClients(sql);
    body.users = (await listClientUsers(sql)).map(toUserDTO);
  }

  return json(body);
}
