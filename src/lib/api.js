// Every browser fetch goes through here. One place for credentials, JSON
// handling, and the 401 contract.

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok) throw new ApiError(res.status, payload);
  return payload;
}

/** Loads the whole dashboard. Throws ApiError(401) when anonymous. */
export const getData = () => fetchJson("/api/data");

/** Always resolves; the response is identical whether or not the account exists. */
export const requestMagicLink = (email) =>
  fetchJson("/api/auth/request", { method: "POST", body: { email } });

export const logout = () => fetchJson("/api/auth/logout", { method: "POST" });

/**
 * Owner-only writes. Every admin mutation is one POST to /api/admin with an
 * `action` discriminator; the server returns the mutated entity so the caller
 * can patch state instead of refetching the whole dashboard.
 *
 * On failure this throws ApiError, whose `.body.field` names the offending
 * input — the admin forms use it to attach the message to the right control.
 */
export const adminAction = (action, payload = {}) =>
  fetchJson("/api/admin", { method: "POST", body: { action, ...payload } });
