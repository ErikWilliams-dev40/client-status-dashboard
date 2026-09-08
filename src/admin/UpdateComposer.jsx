import { useState } from "react";
import { colors, FONT_UI } from "../theme.js";
import { STATUSES } from "../lib/status.js";
import { Button } from "../components/Button.jsx";
import { Field } from "../components/Field.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { Icon, icons } from "../components/Icon.jsx";
import { absoluteTime, relativeTime } from "../lib/format.js";

/**
 * Post an update, optionally moving the status in the same write.
 *
 * The two happen in one statement server-side, so the form offers them
 * together: an update that says "ready for your review" and a status that still
 * reads "In Build" is the inconsistency the single CTE exists to prevent.
 */
export function UpdateComposer({ projects, selected, onSelect, onAction, busy }) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");

  if (projects.length === 0) {
    return (
      <EmptyState
        icon="pencil"
        title="Nothing to post against"
        body="Create a project first, then you can post updates to it."
      />
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!selected || !body.trim()) return;
    const ok = await onAction("update.post", {
      projectId: selected.id,
      body,
      ...(status ? { status } : {}),
    });
    if (ok) {
      setBody("");
      setStatus("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Icon d={icons.pencil} size={14} color={colors.blue} />
          <h3 style={{ margin: 0, fontFamily: FONT_UI, fontSize: 14, color: colors.textPrimary }}>
            Post an update
          </h3>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <Field
            label="Project"
            as="select"
            value={selected?.id ?? ""}
            onChange={(e) => onSelect(e.target.value)}
            options={[
              { id: "", label: "Choose a project…" },
              ...projects.map((p) => ({ id: p.id, label: `${p.clientName} — ${p.name}` })),
            ]}
          />
          <Field
            label="Update"
            as="textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What changed, in the client's words rather than yours."
            hint="Your client reads this verbatim on their dashboard."
          />
          <Field
            label="Also move status to"
            as="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[{ id: "", label: "Leave unchanged" }, ...STATUSES]}
            hint="Posted and applied as one write — they can't disagree."
          />
          <div>
            <Button type="submit" icon="check" loading={busy} disabled={!selected || !body.trim()}>
              Post update
            </Button>
          </div>
        </form>
      </section>

      {selected && (
        <section className="card" style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <h3 style={{ margin: 0, fontFamily: FONT_UI, fontSize: 14, color: colors.textPrimary }}>
              Recent updates
            </h3>
            <StatusBadge status={selected.status} />
          </div>
          {(selected.updates ?? []).length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: colors.textMuted }}>
              No updates yet for {selected.name}.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {selected.updates.map((u) => (
                <li key={u.id} style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 13, color: colors.textSecondary, whiteSpace: "pre-wrap" }}>
                    {u.body}
                  </div>
                  <div
                    style={{ fontSize: 11, color: colors.textMuted }}
                    title={absoluteTime(u.createdAt)}
                  >
                    {relativeTime(u.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
