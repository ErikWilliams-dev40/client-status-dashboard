import { useCallback, useEffect, useState } from "react";

// Real paths, not hashes: vercel.json rewrites everything but /api/* to
// index.html, and api/auth/verify.js redirects to a path, so there is already
// exactly one addressing scheme in play. Adding a route means adding a row.
const ROUTES = [
  [/^\/?$/, () => ({ name: "dashboard" })],
  [/^\/p\/([^/]+)\/?$/, (m) => ({ name: "project", projectId: decodeURIComponent(m[1]) })],
  [/^\/admin\/?$/, () => ({ name: "admin" })],
];

/**
 * Pure so it can be reasoned about on its own. Unknown paths fall back to the
 * dashboard rather than a 404 view. The id is not shape-checked here — the view
 * already has to handle "no such project", and that is also what stops a client
 * from reaching another tenant's project by guessing a URL.
 */
export function parseRoute(pathname) {
  for (const [re, build] of ROUTES) {
    const m = re.exec(pathname);
    if (m) return build(m);
  }
  return { name: "dashboard" };
}

export const projectPath = (id) => `/p/${encodeURIComponent(id)}`;

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // pushState does not fire popstate, so the state has to be set here too.
  const navigate = useCallback((to, { replace = false } = {}) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", to);
    setRoute(parseRoute(to));
    window.scrollTo(0, 0);
  }, []);

  return { route, navigate };
}
