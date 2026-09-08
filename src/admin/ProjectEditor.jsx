import { useState } from "react";
import { colors, FONT_UI } from "../theme.js";
import { LINK_KINDS, STATUSES } from "../lib/status.js";
import { Button } from "../components/Button.jsx";
import { Field } from "../components/Field.jsx";
import { Icon, icons } from "../components/Icon.jsx";

const MAX_LINKS = 10;

const blankDraft = (clientId = "") => ({
  clientId,
  name: "",
  summary: "",
  status: "queued",
  phaseNote: "",
  progress: 0,
});

/**
 * Create a project, and edit the selected one.
 *
 * Links are edited as a whole set and saved with a single `project.links.set`,
 * matching the server: the write is replace-everything, so a partial UI would
 * misrepresent it. Every link id changes on save, which is why the saved set
 * comes back from the server rather than being patched in locally.
 */
export function ProjectEditor({ clients, projects, selected, onSelect, onAction, busy }) {
  const [draft, setDraft] = useState(() => blankDraft());
  const [creating, setCreating] = useState(false);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="card" style={{ padding: 20 }}>
        <Header icon="plus" title="New project" />
        {creating ? (
          <NewProjectForm
            clients={clients}
            draft={draft}
            setDraft={setDraft}
            busy={busy}
            onCancel={() => setCreating(false)}
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await onAction("project.create", {
                clientId: draft.clientId,
                name: draft.name,
                summary: draft.summary || null,
                status: draft.status,
                phaseNote: draft.phaseNote || null,
                progress: Number(draft.progress) || 0,
              });
              if (ok) {
                setDraft(blankDraft(draft.clientId));
                setCreating(false);
              }
            }}
          />
        ) : (
          <Button
            icon="plus"
            disabled={clients.length === 0}
            onClick={() => {
              setDraft(blankDraft(clients[0]?.id ?? ""));
              setCreating(true);
            }}
          >
            {clients.length ? "Add a project" : "Create a client first"}
          </Button>
        )}
      </section>

      <section className="card" style={{ padding: 20 }}>
        <Header icon="layers" title="Edit a project" />
        <Field
          label="Project"
          as="select"
          value={selected?.id ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          options={[
            { id: "", label: projects.length ? "Choose a project…" : "No projects yet" },
            ...projects.map((p) => ({ id: p.id, label: `${p.clientName} — ${p.name}` })),
          ]}
        />
        {selected && (
          <ExistingProjectForm
            key={selected.id}
            project={selected}
            onAction={onAction}
            busy={busy}
          />
        )}
      </section>
    </div>
  );
}

function NewProjectForm({ clients, draft, setDraft, busy, onSubmit, onCancel }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <Field
        label="Client"
        as="select"
        value={draft.clientId}
        onChange={set("clientId")}
        options={clients.map((c) => ({ id: c.id, label: c.name }))}
      />
      <Field label="Name" value={draft.name} onChange={set("name")} placeholder="Marketing site" />
      <Field
        label="Summary"
        value={draft.summary}
        onChange={set("summary")}
        placeholder="One line the client will read first"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field
          label="Status"
          as="select"
          value={draft.status}
          onChange={set("status")}
          options={STATUSES}
        />
        <Field
          label="Progress %"
          type="number"
          min={0}
          max={100}
          value={draft.progress}
          onChange={set("progress")}
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Button type="submit" icon="check" loading={busy} disabled={!draft.clientId || !draft.name.trim()}>
          Create project
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ExistingProjectForm({ project, onAction, busy }) {
  const [form, setForm] = useState({
    name: project.name ?? "",
    summary: project.summary ?? "",
    status: project.status,
    phaseNote: project.phaseNote ?? "",
    progress: project.progress ?? 0,
  });
  const [links, setLinks] = useState(() =>
    (project.links ?? []).map((l) => ({ kind: l.kind, label: l.label ?? "", url: l.url })),
  );

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLink = (i, k, v) => setLinks(links.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
      <Field label="Name" value={form.name} onChange={set("name")} />
      <Field label="Summary" value={form.summary} onChange={set("summary")} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Status" as="select" value={form.status} onChange={set("status")} options={STATUSES} />
        <Field
          label="Progress %"
          type="number"
          min={0}
          max={100}
          value={form.progress}
          onChange={set("progress")}
        />
      </div>
      <Field
        label="Phase note"
        value={form.phaseNote}
        onChange={set("phaseNote")}
        placeholder="Checkout + payments"
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button
          icon="check"
          loading={busy}
          onClick={() =>
            onAction("project.update", {
              projectId: project.id,
              name: form.name,
              // Empty string clears the column — the server maps "" to null,
              // which COALESCE could not have expressed.
              summary: form.summary,
              status: form.status,
              phaseNote: form.phaseNote,
              progress: Number(form.progress) || 0,
            })
          }
        >
          Save changes
        </Button>
        <Button
          variant="danger"
          icon="trash"
          loading={busy}
          onClick={() => onAction("project.archive", { projectId: project.id })}
        >
          Archive
        </Button>
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 14 }}>
        <Header icon="external" title="Links" />
        <p style={{ margin: "0 0 12px", fontSize: 12, color: colors.textMuted }}>
          Must start with <code style={{ color: colors.textSecondary }}>https://</code>. Saving
          replaces the whole set.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {links.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px auto", gap: 8 }}>
              <Field
                as="select"
                value={l.kind}
                onChange={(e) => setLink(i, "kind", e.target.value)}
                options={LINK_KINDS}
              />
              <Field
                value={l.url}
                onChange={(e) => setLink(i, "url", e.target.value)}
                placeholder="https://example.com"
              />
              <Field
                value={l.label}
                onChange={(e) => setLink(i, "label", e.target.value)}
                placeholder="Label (optional)"
              />
              <Button
                variant="ghost"
                icon="trash"
                aria-label="Remove link"
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            icon="plus"
            disabled={links.length >= MAX_LINKS}
            onClick={() => setLinks([...links, { kind: "live", label: "", url: "" }])}
          >
            Add link
          </Button>
          <Button
            icon="check"
            loading={busy}
            onClick={async () => {
              const saved = await onAction("project.links.set", {
                projectId: project.id,
                links: links.map((l) => ({
                  kind: l.kind,
                  label: l.label.trim() || null,
                  url: l.url.trim(),
                })),
              });
              // Ids are regenerated server-side on every save, so adopt the
              // returned set rather than keeping the local one.
              if (saved?.links) {
                setLinks(saved.links.map((l) => ({ kind: l.kind, label: l.label ?? "", url: l.url })));
              }
            }}
          >
            Save links
          </Button>
        </div>
      </div>
    </div>
  );
}

function Header({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <Icon d={icons[icon]} size={14} color={colors.blue} />
      <h3 style={{ margin: 0, fontFamily: FONT_UI, fontSize: 14, color: colors.textPrimary }}>
        {title}
      </h3>
    </div>
  );
}
