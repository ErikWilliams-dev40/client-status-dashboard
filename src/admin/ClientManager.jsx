import { useState } from "react";
import { colors, FONT_MONO, FONT_UI } from "../theme.js";
import { Button } from "../components/Button.jsx";
import { Field } from "../components/Field.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icon, icons } from "../components/Icon.jsx";
import { relativeTime } from "../lib/format.js";

/**
 * Clients and their contacts.
 *
 * This is the screen that makes a client *user* creatable at all — before it,
 * the only route was the manual INSERT in the README. Inviting sends no email:
 * the contact signs in through the normal magic-link form. The copy says so,
 * because "Invite" that sends nothing is otherwise a trap.
 */
export function ClientManager({ clients, users, onAction, busy }) {
  const [newClient, setNewClient] = useState("");
  const [invite, setInvite] = useState({ clientId: "", email: "", name: "" });
  const [renaming, setRenaming] = useState(null); // { id, name }

  const usersFor = (clientId) => users.filter((u) => u.clientId === clientId);

  async function createClient(e) {
    e.preventDefault();
    if (!newClient.trim()) return;
    if (await onAction("client.create", { name: newClient })) setNewClient("");
  }

  async function submitRename(e) {
    e.preventDefault();
    if (!renaming?.name.trim()) return;
    const ok = await onAction("client.rename", {
      clientId: renaming.id,
      name: renaming.name,
    });
    if (ok) setRenaming(null);
  }

  async function submitInvite(e) {
    e.preventDefault();
    if (!invite.clientId || !invite.email.trim()) return;
    const ok = await onAction("user.invite", {
      clientId: invite.clientId,
      email: invite.email,
      name: invite.name.trim() || undefined,
    });
    if (ok) setInvite({ clientId: invite.clientId, email: "", name: "" });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="card" style={{ padding: 24 }}>
        <SectionTitle icon="plus" title="New client" />
        <form onSubmit={createClient} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field
              label="Client name"
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
              placeholder="Northwind Coffee"
            />
          </div>
          <Button type="submit" icon="plus" loading={busy} disabled={!newClient.trim()}>
            Create
          </Button>
        </form>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <SectionTitle icon="mail" title="Invite a contact" />
        <p style={{ margin: "0 0 14px", fontSize: 12, color: colors.textMuted }}>
          No email is sent. Tell them to visit the sign-in page and enter this address
          themselves — they&rsquo;ll get a link that&rsquo;s good for 15 minutes.
        </p>
        <form onSubmit={submitInvite} style={{ display: "grid", gap: 12 }}>
          <Field
            label="Client"
            as="select"
            value={invite.clientId}
            onChange={(e) => setInvite({ ...invite, clientId: e.target.value })}
            options={[
              { id: "", label: clients.length ? "Choose a client…" : "Create a client first" },
              ...clients.map((c) => ({ id: c.id, label: c.name })),
            ]}
          />
          <div className="form-two">
            <Field
              label="Email"
              type="email"
              icon="mail"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="nora@northwind.test"
            />
            <Field
              label="Name (optional)"
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
              placeholder="Nora Bell"
            />
          </div>
          <div>
            <Button
              type="submit"
              icon="user"
              loading={busy}
              disabled={!invite.clientId || !invite.email.trim()}
            >
              Give access
            </Button>
          </div>
        </form>
      </section>

      {clients.length === 0 ? (
        <EmptyState icon="user" title="No clients yet" body="Create one above to get started." />
      ) : (
        clients.map((c) => (
          <section key={c.id} className="card" style={{ padding: 24 }}>
            {renaming?.id === c.id ? (
              <form
                onSubmit={submitRename}
                style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
              >
                <div style={{ flex: 1 }}>
                  <Field
                    label="Client name"
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                  />
                </div>
                <Button type="submit" icon="check" loading={busy}>
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setRenaming(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: FONT_UI,
                    fontSize: 15,
                    color: colors.textPrimary,
                  }}
                >
                  {c.name}
                </h3>
                <Button
                  variant="ghost"
                  icon="pencil"
                  onClick={() => setRenaming({ id: c.id, name: c.name })}
                >
                  Rename
                </Button>
              </div>
            )}

            <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 8 }}>
              {usersFor(c.id).length === 0 && (
                <li style={{ fontSize: 12, color: colors.textMuted }}>
                  No contacts yet — nobody can sign in for this client.
                </li>
              )}
              {usersFor(c.id).map((u) => (
                <li
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    opacity: u.disabledAt ? 0.55 : 1,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 12,
                        color: colors.textSecondary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {u.email}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>
                      {u.name ? `${u.name} · ` : ""}
                      {u.disabledAt
                        ? "access revoked"
                        : u.lastLoginAt
                          ? `last signed in ${relativeTime(u.lastLoginAt)}`
                          : "never signed in"}
                    </div>
                  </div>
                  <Button
                    variant={u.disabledAt ? "ghost" : "danger"}
                    icon={u.disabledAt ? "check" : "x"}
                    loading={busy}
                    onClick={() =>
                      onAction(u.disabledAt ? "user.enable" : "user.disable", { userId: u.id })
                    }
                  >
                    {u.disabledAt ? "Restore" : "Revoke"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <Icon d={icons[icon]} size={14} color={colors.blue} />
      <h3 style={{ margin: 0, fontFamily: FONT_UI, fontSize: 14, color: colors.textPrimary }}>
        {title}
      </h3>
    </div>
  );
}
