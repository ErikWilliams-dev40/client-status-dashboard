import { colors, FONT_MONO } from "../theme.js";
import { getStatus } from "../lib/status.js";
import { absoluteTime, pluralize, relativeTime } from "../lib/format.js";
import { Icon, icons } from "../components/Icon.jsx";
import { Button } from "../components/Button.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { LinkButton } from "../components/LinkButton.jsx";

const UPDATE_LIMIT = 10;

export function ProjectDetail({ project, user, onBack }) {
  if (!project) {
    return <EmptyState icon="alert" title="Project not found" body="It may have been archived, or you may no longer have access to it." action={<Button variant="ghost" onClick={onBack}>Back to all projects</Button>} />;
  }

  const status = getStatus(project.status);
  const updates = project.updates ?? [];
  const links = project.links ?? [];
  const isOwner = user?.role === "owner";

  return (
    <div className="fade-in">
      <button type="button" onClick={onBack} className="back-link">
        <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon d={icons.arrow_right} size={14} color="currentColor" /></span>
        All projects
      </button>

      <header style={{ margin: "25px 0 26px" }}>
        <div className="eyebrow">{isOwner && project.clientName ? project.clientName : "Project overview"}</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.summary && <p className="page-subtitle">{project.summary}</p>}
          </div>
          <StatusBadge status={project.status} showHint />
        </div>
      </header>

      <div className="project-detail-grid">
        <main>
          <section className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Overall progress</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: colors.textPrimary }}>{Math.min(100, Math.max(0, Number(project.progress) || 0))}%</div>
              </div>
              <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: `${status.color}12` }}><Icon d={icons[status.icon]} size={19} color={status.color} /></span>
            </div>
            <ProgressBar value={project.progress} color={status.color} label={project.name} height={8} hideValue />
            <div className="form-two" style={{ marginTop: 20 }}>
              <Detail label="Current focus" icon="activity" value={project.phaseNote || "No current focus has been added."} />
              <Detail label="Last updated" icon="clock" value={relativeTime(project.updatedAt) || "Not yet updated"} title={absoluteTime(project.updatedAt)} />
            </div>
          </section>

          <section className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 22, paddingBottom: 14, borderBottom: `1px solid ${colors.border}` }}>
              <h2 style={{ margin: 0, fontSize: 17, color: colors.textPrimary }}>Project updates</h2>
              {updates.length > 0 && <span style={{ fontSize: 11, color: colors.textMuted }}>{pluralize(updates.length, "update", "updates")}</span>}
            </div>
            {updates.length === 0 ? (
              <div style={{ padding: "26px 0" }}><EmptyState icon="clock" title="No updates yet" body="Progress notes will appear here as work moves along." /></div>
            ) : (
              <div className="timeline">
                {updates.map((update, index) => (
                  <article key={update.id} style={{ display: "flex", gap: 16, paddingBottom: index === updates.length - 1 ? 0 : 28 }}>
                    <span style={{ position: "relative", zIndex: 1, flexShrink: 0, width: 12, height: 12, marginTop: 5, borderRadius: "50%", background: index === 0 ? colors.blue : colors.textFaint, border: `3px solid ${colors.bgCard}`, boxShadow: index === 0 ? `0 0 0 3px ${colors.blue}18` : undefined }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <time title={absoluteTime(update.createdAt)} style={{ display: "block", marginBottom: 7, fontFamily: FONT_MONO, fontSize: 10, color: colors.textMuted }}>{index === 0 ? "Latest · " : ""}{relativeTime(update.createdAt)}</time>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: colors.textPrimary, whiteSpace: "pre-wrap" }}>{update.body}</p>
                    </div>
                  </article>
                ))}
                {updates.length === UPDATE_LIMIT && <p style={{ margin: "24px 0 0", fontSize: 11, color: colors.textDim }}>Showing the {UPDATE_LIMIT} most recent updates.</p>}
              </div>
            )}
          </section>
        </main>

        <aside style={{ display: "grid", gap: 16 }}>
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><Icon d={icons.external} size={15} color={colors.blue} /><h2 style={{ margin: 0, fontSize: 14, color: colors.textPrimary }}>Project links</h2></div>
            {links.length ? <div style={{ display: "grid", gap: 9 }}>{links.map((link) => <LinkButton key={link.id} link={link} showHost />)}</div> : <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: colors.textMuted }}>No project links have been shared yet.</p>}
          </section>
          <section className="card metric-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}><Icon d={icons.shield} size={14} color={colors.green} /><strong style={{ fontSize: 13, color: colors.textPrimary }}>Private workspace</strong></div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: colors.textMuted }}>Only invited contacts for this client can view this project.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, icon, value, title }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: 13, borderRadius: 11, background: colors.bgSubtle }}>
      <Icon d={icons[icon]} size={14} color={colors.blue} />
      <div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: colors.textMuted }}>{label}</div><div title={title} style={{ marginTop: 5, fontSize: 12, lineHeight: 1.5, color: colors.textPrimary }}>{value}</div></div>
    </div>
  );
}
