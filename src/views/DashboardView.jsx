import { useMemo, useState } from "react";
import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { getStatus, NEEDS_ATTENTION, STATUSES } from "../lib/status.js";
import { pluralize, relativeTime, absoluteTime } from "../lib/format.js";
import { Icon, icons } from "../components/Icon.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { LinkButton } from "../components/LinkButton.jsx";

const CARD_LINK_LIMIT = 3;

/**
 * Groups projects by client, preserving server order.
 *
 * listProjectsFor() already returns rows ORDER BY c.name, p.sort_order,
 * p.created_at, so one pass is enough and the view never sorts.
 */
function groupByClient(projects) {
  const groups = [];
  const byId = new Map();
  for (const p of projects) {
    let g = byId.get(p.clientId);
    if (!g) {
      g = { clientId: p.clientId, clientName: p.clientName, projects: [] };
      byId.set(p.clientId, g);
      groups.push(g);
    }
    g.projects.push(p);
  }
  return groups;
}

export function DashboardView({ data, onOpenProject }) {
  const projects = data?.projects ?? [];
  const isOwner = data?.user?.role === "owner";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesQuery = !needle || [p.name, p.summary, p.clientName, p.phaseNote].some((value) => value?.toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [projects, query, statusFilter]);
  const groups = groupByClient(visible);
  const attention = projects.filter((p) => NEEDS_ATTENTION.includes(p.status));
  const active = projects.filter((p) => !["queued", "live"].includes(p.status)).length;
  const live = projects.filter((p) => p.status === "live").length;

  if (projects.length === 0) {
    return (
      <EmptyState
        icon="layers"
        title="No projects yet"
        body={
          isOwner
            ? "Create a client and their first project from the admin screen."
            : "Your projects will appear here as soon as they're set up."
        }
      />
    );
  }

  return (
    <div className="fade-in">
      {isOwner ? (
        <Heading title="Project overview" sub="Monitor delivery across every client workspace." />
      ) : (
        <Heading
          title={projects[0]?.clientName ?? "Your projects"}
          sub="A clear view of what’s moving, what needs input, and what’s already live."
        />
      )}

      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <Stat label="Total projects" value={projects.length} icon="layers" color={colors.blue} />
        <Stat label="In progress" value={active} icon="activity" color={colors.indigo} />
        <Stat label="Live" value={live} icon="rocket" color={colors.green} />
      </div>

      {attention.length > 0 && (
        <AttentionStrip items={attention} onOpenProject={onOpenProject} />
      )}

      {(isOwner || projects.length > 4) && (
        <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 12, marginBottom: 24 }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <span style={{ position: "absolute", left: 12, top: 11, display: "inline-flex", pointerEvents: "none" }}><Icon d={icons.search} size={15} color={colors.textMuted} /></span>
            <input className="field-control" aria-label="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects or clients" style={{ width: "100%", minHeight: 38, padding: "8px 12px 8px 36px", borderRadius: 9, border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.textPrimary }} />
          </div>
          <select className="field-control" aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minHeight: 38, padding: "8px 34px 8px 11px", borderRadius: 9, border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.textSecondary }}>
            <option value="all">All statuses</option>
            {STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </select>
        </div>
      )}

      {visible.length === 0 && <EmptyState icon="search" title="No matching projects" body="Try another search or clear the status filter." />}

      {groups.map((g) => (
        <section key={g.clientId} style={{ marginBottom: 32 }}>
          {/* A client sees only their own projects, so naming the client here
              would just be repeating the page heading back at them. */}
          {isOwner && (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                margin: "0 0 14px",
                paddingBottom: 8,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                {g.clientName}
              </h2>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: colors.textMuted }}>
                {pluralize(g.projects.length, "project", "projects")}
              </span>
            </div>
          )}

          <div className="projects-grid">
            {g.projects.map((p) => {
              const status = getStatus(p.status);
              const needsAttention = NEEDS_ATTENTION.includes(p.status);
              const latest = p.updates?.[0];
              const shown = (p.links ?? []).slice(0, CARD_LINK_LIMIT);
              const overflow = (p.links?.length ?? 0) - shown.length;

              const open = () => onOpenProject(p.id);

              return (
                <div
                  key={p.id}
                  data-testid="project-card"
                  onClick={open}
                  className="card interactive-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    padding: 20,
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: needsAttention ? `inset 3px 0 0 ${status.color}, 0 8px 24px rgba(15,23,42,.04)` : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                    <button
                      type="button"
                      data-testid="project-name"
                      onClick={open}
                      style={{
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        margin: 0,
                        flex: 1,
                        fontSize: 16,
                        fontWeight: 700,
                        color: colors.textPrimary,
                      }}
                    >
                      {p.name}
                    </button>
                    <StatusBadge status={p.status} size="sm" />
                  </div>

                  {p.summary && (
                    <p
                      className="clamp-2"
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: colors.textSecondary,
                      }}
                    >
                      {p.summary}
                    </p>
                  )}

                  <ProgressBar value={p.progress} color={status.color} label={p.name} />

                  {p.phaseNote && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color: colors.textMuted,
                      }}
                    >
                      <Icon d={icons.activity} size={12} color={colors.textMuted} />
                      {p.phaseNote}
                    </div>
                  )}

                  <div
                    style={{
                      padding: "12px 13px",
                      borderRadius: 10,
                      background: colors.bgSubtle,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: colors.textSecondary,
                    }}
                  >
                    {latest ? (
                      <>
                        <p className="clamp-2" style={{ margin: 0, color: colors.textPrimary }}>
                          {latest.body}
                        </p>
                        <span
                          title={absoluteTime(latest.createdAt)}
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 11,
                            color: colors.textMuted,
                          }}
                        >
                          {relativeTime(latest.createdAt)}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: colors.textDim }}>
                        No updates yet
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: "auto",
                    }}
                  >
                    {shown.map((l) => (
                      <LinkButton key={l.id} link={l} />
                    ))}
                    {overflow > 0 && (
                      <span
                        style={{ fontFamily: FONT_MONO, fontSize: 11, color: colors.textMuted }}
                      >
                        +{overflow}
                      </span>
                    )}
                    <span
                      title={absoluteTime(p.updatedAt)}
                      style={{
                        marginLeft: "auto",
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color: colors.textMuted,
                      }}
                    >
                      {relativeTime(p.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Heading({ title, sub }) {
  return (
    <div style={{ margin: "0 0 26px" }}>
      <div className="eyebrow">Workspace</div>
      <h1 className="page-title" style={{ marginTop: 7 }}>
        {title}
      </h1>
      <div className="page-subtitle">
        {sub}
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }) {
  return (
    <div className="card metric-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px" }}>
      <span style={{ width: 36, height: 36, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 10, background: `${color}12` }}><Icon d={icons[icon]} size={16} color={color} /></span>
      <span><strong style={{ display: "block", fontSize: 19, color: colors.textPrimary }}>{value}</strong><span style={{ display: "block", marginTop: 1, fontSize: 11, color: colors.textMuted }}>{label}</span></span>
    </div>
  );
}

/** `review` and `blocked` are the two statuses that mean someone must act. */
function AttentionStrip({ items, onOpenProject }) {
  return (
    <div
      className="card metric-card"
      style={{ padding: 16, marginBottom: 28, display: "flex", flexWrap: "wrap", gap: 12, borderColor: "#FDE68A", background: "linear-gradient(135deg,#FFFBEB,#fff)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon d={icons.alert} size={16} color={colors.amber} />
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>
          {pluralize(items.length, "project needs", "projects need")} attention
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginLeft: "auto" }}>
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpenProject(p.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              background: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary,
              fontFamily: FONT_UI,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {p.name}
            <StatusBadge status={p.status} size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}

