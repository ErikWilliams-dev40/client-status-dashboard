import { useCallback, useEffect, useState } from "react";
import { colors } from "./theme.js";
import { Icon, icons } from "./components/Icon.jsx";
import { Shell } from "./components/Shell.jsx";
import { Button } from "./components/Button.jsx";
import { LoginView } from "./views/LoginView.jsx";
import { DashboardView } from "./views/DashboardView.jsx";
import { ProjectDetail } from "./views/ProjectDetail.jsx";
import { AdminView } from "./views/AdminView.jsx";
import { ApiError, getData, logout } from "./lib/api.js";
import { projectPath, useRoute } from "./lib/useRoute.js";

const EXPIRED_NOTICE =
  "That sign-in link has expired or was already used — request a new one below.";

/** Reads ?e= once on first paint, then strips it so a reload doesn't re-show it. */
function useLandingNotice() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("e") === "expired") setNotice(EXPIRED_NOTICE);
    if (params.has("e")) {
      params.delete("e");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);
  return notice;
}

export default function App() {
  // "loading" | "anonymous" | "authenticated"
  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const notice = useLandingNotice();

  const load = useCallback(async () => {
    try {
      setData(await getData());
      setPhase("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setData(null);
        setPhase("anonymous");
        return;
      }
      // A cold Neon branch can take a few seconds; a genuine failure still
      // lands the user somewhere they can act.
      console.error(err);
      setData(null);
      setPhase("anonymous");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function signOut() {
    try {
      await logout();
    } finally {
      setData(null);
      setPhase("anonymous");
    }
  }

  /**
   * Fold an admin write back into the single `data` object.
   *
   * The server returns project rows through listProjectsFor(), the same query
   * the dashboard is built from, so a patched project is shape-identical to a
   * fetched one and the views cannot tell the difference.
   */
  const applyWrite = useCallback((action, res) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev };

      if (res?.project) {
        const i = next.projects.findIndex((p) => p.id === res.project.id);
        next.projects =
          i === -1
            ? [...next.projects, res.project]
            : next.projects.map((p) => (p.id === res.project.id ? res.project : p));
      }
      // An archived project drops out of the authorized read, so it is removed
      // here rather than patched — that mirrors what a refetch would return.
      if (action === "project.archive" && res?.id) {
        next.projects = next.projects.filter((p) => p.id !== res.id);
      }
      // Links are replaced wholesale server-side, so the whole array is swapped.
      if (action === "project.links.set" && res?.projectId) {
        next.projects = next.projects.map((p) =>
          p.id === res.projectId ? { ...p, links: res.links } : p,
        );
      }
      if (res?.client) {
        const i = (next.clients ?? []).findIndex((c) => c.id === res.client.id);
        next.clients =
          i === -1
            ? [...(next.clients ?? []), res.client]
            : next.clients.map((c) => (c.id === res.client.id ? res.client : c));
        // clientName is denormalized onto every project row by listProjectsFor,
        // so a rename has to be mirrored there or the cards go stale.
        next.projects = next.projects.map((p) =>
          p.clientId === res.client.id ? { ...p, clientName: res.client.name } : p,
        );
      }
      if (res?.user) {
        const i = (next.users ?? []).findIndex((u) => u.id === res.user.id);
        next.users =
          i === -1
            ? [...(next.users ?? []), res.user]
            : next.users.map((u) => (u.id === res.user.id ? { ...u, ...res.user } : u));
      }
      return next;
    });
  }, []);

  if (phase === "loading") return <Booting />;
  if (phase === "anonymous") return <LoginView notice={notice} />;
  return <SignedIn data={data} onSignOut={signOut} onApplied={applyWrite} />;
}

function Booting() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: colors.bgBase,
      }}
    >
      <span className="spin" style={{ display: "inline-flex" }}>
        <Icon d={icons.refresh} size={20} color={colors.textMuted} />
      </span>
    </div>
  );
}

/**
 * The authenticated app.
 *
 * useRoute() lives here rather than in App so an anonymous visitor never
 * installs a popstate listener. That is legal despite App's early returns
 * because this is a separate component, not a branch inside App.
 *
 * Shell wraps both branches once, outside the switch, so it survives navigation
 * instead of remounting.
 */
function SignedIn({ data, onSignOut, onApplied }) {
  const { route, navigate } = useRoute();
  const goHome = useCallback(() => navigate("/"), [navigate]);
  const isOwner = data.user?.role === "owner";

  const project =
    route.name === "project"
      ? data.projects.find((p) => p.id === route.projectId)
      : null;

  // A client who types /admin lands on the dashboard rather than an error. This
  // is presentation only — requireUser(req, { role: "owner" }) is the real gate,
  // and it does not care what the browser renders.
  const showAdmin = route.name === "admin" && isOwner;

  const adminLink = isOwner ? (
    <Button
      variant="ghost"
      icon={showAdmin ? "layers" : "settings"}
      onClick={() => navigate(showAdmin ? "/" : "/admin")}
    >
      {showAdmin ? "Dashboard" : "Admin"}
    </Button>
  ) : null;

  return (
    <Shell user={data.user} onSignOut={onSignOut} onHome={goHome} right={adminLink}>
      {showAdmin ? (
        <AdminView data={data} onApplied={onApplied} />
      ) : route.name === "project" ? (
        <ProjectDetail project={project} user={data.user} onBack={goHome} />
      ) : (
        <DashboardView data={data} onOpenProject={(id) => navigate(projectPath(id))} />
      )}
    </Shell>
  );
}
