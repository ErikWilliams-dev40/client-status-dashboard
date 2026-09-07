import { useCallback, useEffect, useState } from "react";
import { colors } from "./theme.js";
import { Icon, icons } from "./components/Icon.jsx";
import { Shell } from "./components/Shell.jsx";
import { LoginView } from "./views/LoginView.jsx";
import { DashboardView } from "./views/DashboardView.jsx";
import { ProjectDetail } from "./views/ProjectDetail.jsx";
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

  if (phase === "loading") return <Booting />;
  if (phase === "anonymous") return <LoginView notice={notice} />;
  return <SignedIn data={data} onSignOut={signOut} />;
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
function SignedIn({ data, onSignOut }) {
  const { route, navigate } = useRoute();
  const goHome = useCallback(() => navigate("/"), [navigate]);

  // /admin is parsed but unhandled until Phase 5; it falls through to here.
  const project =
    route.name === "project"
      ? data.projects.find((p) => p.id === route.projectId)
      : null;

  return (
    <Shell user={data.user} onSignOut={onSignOut} onHome={goHome}>
      {route.name === "project" ? (
        <ProjectDetail project={project} user={data.user} onBack={goHome} />
      ) : (
        <DashboardView data={data} onOpenProject={(id) => navigate(projectPath(id))} />
      )}
    </Shell>
  );
}
