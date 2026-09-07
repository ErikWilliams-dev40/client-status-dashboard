import { colors, FONT_MONO } from "../theme.js";
import { getStatus } from "../lib/status.js";
import { absoluteTime, pluralize, relativeTime } from "../lib/format.js";
import { Icon, icons } from "../components/Icon.jsx";
import { Button } from "../components/Button.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { LinkButton } from "../components/LinkButton.jsx";

// api/data.js caps updates at the 10 most recent per project.
const UPDATE_LIMIT = 10;

/**
 * One project, selected client-side from the payload already in memory — there
 * is no per-project endpoint and no second fetch.
 *
 * A missing `project` is the not-found case. It is also the tenant boundary: a
 * client who pastes another client's /p/<uuid> lands here, because that project
 * was never in their payload to begin with.
 */
export function ProjectDetail({ project, user, onBack }) {
  if (!project) {
    return (
      <EmptyState
        icon="alert"
        title="Project not found"
        body="It may have been archived, or you no longer have access to it."
        action={
          <Button variant="ghost" onClick={onBack}>
            Back to all projects
          </Button>
        }
      />
    );
  }

  const status = getStatus(project.status);
  const updates = project.updates ?? [];
  const links = project.links ?? [];
  const isOwner = user?.role === "owner";

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        {/* There is no left-arrow in the icon set; rotating the right one keeps
            Icon.jsx untouched. */}
        <Button variant="ghost" onClick={onBack}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon d={icons.arrow_right} size={14} color="currentColor" />
          </span>
          Back
        </Button>
      </div>

      {/* A client already knows which company they are — this is for the owner. */}
      {isOwner && project.clientName && (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: colors.textMuted,
            marginBottom: 6,
          }}
        >
          {project.clientName}
        </div>
      )}

      <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 600, color: colors.textPrimary }}>
        {project.name}
      </h1>

      <StatusBadge status={project.status} showHint />

      {project.summary && (
        <p
          style={{
            margin: "16px 0 0",
            maxWidth: "70ch",
            fontSize: 14,
            lineHeight: 1.7,
            color: colors.textSecondary,
          }}
        >
          {project.summary}
        </p>
      )}

      <div className="card" style={{ padding: 18, margin: "24px 0" }}>
        <ProgressBar
          value={project.progress}
          color={status.color}
          label={project.name}
          height={8}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 12,
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: colors.textMuted,
          }}
        >
          {project.phaseNote && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon d={icons.activity} size={12} color={colors.textMuted} />
              {project.phaseNote}
            </span>
          )}
          <span style={{ marginLeft: "auto" }} title={absoluteTime(project.updatedAt)}>
            Updated {relativeTime(project.updatedAt)}
          </span>
        </div>
      </div>

      {links.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
          {links.map((l) => (
            <LinkButton key={l.id} link={l} showHost />
          ))}
        </div>
      )}

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
            Updates
          </h2>
          {updates.length > 0 && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: colors.textMuted }}>
              {pluralize(updates.length, "update", "updates")}
            </span>
          )}
        </div>

        {updates.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No updates yet"
            body="Progress notes will appear here as work moves along."
          />
        ) : (
          <>
            {/* Server order is newest-first; do not re-sort. */}
            <div className="timeline">
              {updates.map((u, i) => (
                <div
                  key={u.id}
                  style={{ display: "flex", gap: 14, paddingBottom: i === updates.length - 1 ? 0 : 22 }}
                >
                  <span
                    style={{
                      position: "relative",
                      zIndex: 1,
                      flexShrink: 0,
                      width: 11,
                      height: 11,
                      marginTop: 4,
                      borderRadius: "50%",
                      background: i === 0 ? colors.blue : colors.textFaint,
                      border: `2px solid ${colors.bgBase}`,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      title={absoluteTime(u.createdAt)}
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color: colors.textMuted,
                        marginBottom: 4,
                      }}
                    >
                      {relativeTime(u.createdAt)}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: colors.textPrimary,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {u.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Only worth saying when the list is actually truncated. */}
            {updates.length === UPDATE_LIMIT && (
              <p
                style={{
                  margin: "20px 0 0",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: colors.textDim,
                }}
              >
                Showing the {UPDATE_LIMIT} most recent updates.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
