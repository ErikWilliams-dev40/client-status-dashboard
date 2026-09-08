import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { getStatus, NEEDS_ATTENTION } from "../lib/status.js";
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
  const groups = groupByClient(projects);
  const attention = projects.filter((p) => NEEDS_ATTENTION.includes(p.status));

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
        <Heading title="All projects" sub={pluralize(projects.length, "project", "projects")} />
      ) : (
        <Heading
          title={groups[0]?.clientName ?? "Your projects"}
          sub={pluralize(projects.length, "project", "projects")}
        />
      )}

      {attention.length > 0 && (
        <AttentionStrip items={attention} onOpenProject={onOpenProject} />
      )}

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
                // Not a <button>: this card contains anchors, which a button may
                // not legally wrap. role + tabIndex + keydown give the same
                // affordance, and :focus-visible in styles.css does the ring.
                <div
                  key={p.id}
                  data-testid="project-card"
                  role="button"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open();
                    }
                  }}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 18,
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: needsAttention ? `0 0 0 1px ${status.color}55` : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                    <h3
                      data-testid="project-name"
                      style={{
                        margin: 0,
                        flex: 1,
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.textPrimary,
                      }}
                    >
                      {p.name}
                    </h3>
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
                      paddingTop: 12,
                      borderTop: `1px solid ${colors.border}66`,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: colors.textSecondary,
                    }}
                  >
                    {latest ? (
                      <>
                        <p className="clamp-2" style={{ margin: 0 }}>
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
    <div style={{ margin: "0 0 20px" }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: colors.textPrimary }}>
        {title}
      </h1>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}

/** `review` and `blocked` are the two statuses that mean someone must act. */
function AttentionStrip({ items, onOpenProject }) {
  return (
    <div
      className="card metric-card"
      style={{ padding: 16, marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 12 }}
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

