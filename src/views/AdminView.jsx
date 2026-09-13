import { useCallback, useState } from "react";
import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { ApiError, adminAction } from "../lib/api.js";
import { Toast } from "../components/Toast.jsx";
import { ClientManager } from "../admin/ClientManager.jsx";
import { ProjectEditor } from "../admin/ProjectEditor.jsx";
import { UpdateComposer } from "../admin/UpdateComposer.jsx";

const TABS = [
  { id: "projects", label: "Projects" },
  { id: "updates", label: "Updates" },
  { id: "clients", label: "Clients" },
];

/**
 * The owner's write surface.
 *
 * Every mutation goes through one `run()` so the busy flag, the toast, and the
 * error contract live in exactly one place — the three managers below stay
 * presentational and never touch the network themselves.
 *
 * `onApplied` hands the mutated entity back to App, which patches its single
 * `data` object. The server returns project rows through the same query the
 * dashboard uses, so a patched project is shape-identical to a fetched one.
 */
export function AdminView({ data, onApplied }) {
  const [tab, setTab] = useState("projects");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const projects = data.projects ?? [];
  const clients = data.clients ?? [];
  const users = data.users ?? [];
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  /**
   * Returns the response on success and `null` on failure, so a caller can do
   * `if (await onAction(...))` to decide whether to clear its form.
   */
  const run = useCallback(
    async (action, payload) => {
      setBusy(true);
      try {
        const res = await adminAction(action, payload);
        onApplied(action, res);
        setToast({ tone: "success", message: MESSAGES[action] ?? "Saved." });
        return res;
      } catch (err) {
        // ApiError.body.field names the offending input; surfacing it in the
        // toast is enough at this size, and beats a silent no-op.
        const detail = err instanceof ApiError ? (err.body?.message ?? err.message) : null;
        setToast({ tone: "error", message: detail ?? "Something went wrong." });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [onApplied],
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 26 }}>
        <div className="eyebrow">Owner workspace</div>
        <h1 className="page-title" style={{ marginTop: 7 }}>Manage delivery</h1>
        <p className="page-subtitle">Create client workspaces, publish progress, and manage access from one place.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <AdminStat value={projects.length} label="Projects" />
        <AdminStat value={clients.length} label="Clients" />
        <AdminStat value={users.length} label="Contacts" />
      </div>

      <div
        role="tablist"
        className="card"
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          padding: 5,
          width: "fit-content",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "9px 16px",
              border: 0,
              borderRadius: 10,
              background: tab === t.id ? colors.bgSubtle : "transparent",
              color: tab === t.id ? colors.blue : colors.textMuted,
              fontFamily: FONT_UI,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "projects" && (
        <ProjectEditor
          clients={clients}
          projects={projects}
          selected={selected}
          onSelect={setSelectedId}
          onAction={run}
          busy={busy}
        />
      )}
      {tab === "updates" && (
        <UpdateComposer
          projects={projects}
          selected={selected}
          onSelect={setSelectedId}
          onAction={run}
          busy={busy}
        />
      )}
      {tab === "clients" && (
        <ClientManager clients={clients} users={users} onAction={run} busy={busy} />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function AdminStat({ value, label }) {
  return (
    <div className="card metric-card" style={{ padding: "15px 16px" }}>
      <strong style={{ display: "block", fontSize: 20, color: colors.textPrimary }}>{value}</strong>
      <span style={{ display: "block", marginTop: 2, fontSize: 11, color: colors.textMuted }}>{label}</span>
    </div>
  );
}

const MESSAGES = {
  "client.create": "Client created.",
  "client.rename": "Client renamed.",
  "user.invite": "Access granted — tell them to sign in with that address.",
  "user.disable": "Access revoked.",
  "user.enable": "Access restored.",
  "project.create": "Project created.",
  "project.update": "Project saved.",
  "project.archive": "Project archived.",
  "project.unarchive": "Project restored.",
  "project.links.set": "Links saved.",
  "update.post": "Update posted.",
};
