// Create the owner account plus two demo clients with projects.
//   node --env-file=.env scripts/seed.mjs
//
// Idempotent: re-running updates rather than duplicating. The two demo clients
// exist so the cross-client isolation check has something to prove.
import { neon, neonConfig } from "@neondatabase/serverless";

const { DATABASE_URL, OWNER_EMAIL, OWNER_NAME } = process.env;

// Same dev-only local-proxy escape hatch as api/_lib/db.js.
if (!process.env.VERCEL_ENV && process.env.NEON_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
}

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set (did you pass --env-file=.env?)");
  process.exit(1);
}
if (!OWNER_EMAIL) {
  console.error("OWNER_EMAIL is not set — that address becomes the owner account.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const norm = (e) => e.trim().toLowerCase();

// ---- owner -------------------------------------------------------------
const ownerEmail = OWNER_EMAIL.trim();
const [owner] = await sql`
  INSERT INTO users (email, email_norm, name, role, client_id)
  VALUES (${ownerEmail}, ${norm(ownerEmail)}, ${OWNER_NAME ?? "Owner"}, 'owner', NULL)
  ON CONFLICT (email_norm) DO UPDATE
    SET role = 'owner', client_id = NULL, disabled_at = NULL,
        name = COALESCE(EXCLUDED.name, users.name)
  RETURNING id, email`;
console.log(`owner: ${owner.email}`);

// ---- demo data ---------------------------------------------------------
async function upsertClient(name) {
  const [existing] = await sql`SELECT id FROM clients WHERE name = ${name} LIMIT 1`;
  if (existing) return existing.id;
  const [row] = await sql`INSERT INTO clients (name) VALUES (${name}) RETURNING id`;
  return row.id;
}

async function upsertProject(clientId, p) {
  const [existing] = await sql`
    SELECT id FROM projects WHERE client_id = ${clientId} AND name = ${p.name} LIMIT 1`;
  if (existing) return existing.id;
  const [row] = await sql`
    INSERT INTO projects (client_id, name, summary, status, phase_note, progress, sort_order)
    VALUES (${clientId}, ${p.name}, ${p.summary}, ${p.status},
            ${p.phaseNote}, ${p.progress}, ${p.sortOrder ?? 0})
    RETURNING id`;
  for (const l of p.links ?? []) {
    await sql`INSERT INTO project_links (project_id, kind, url) VALUES (${row.id}, ${l.kind}, ${l.url})`;
  }
  if (p.update) {
    await sql`
      INSERT INTO updates (project_id, body, status_at_time, author_id)
      VALUES (${row.id}, ${p.update}, ${p.status}, ${owner.id})`;
  }
  return row.id;
}

const demo = [
  {
    client: "Northwind Coffee",
    projects: [
      {
        name: "Storefront Rebuild",
        summary: "Headless commerce rebuild with a new checkout flow.",
        status: "building",
        phaseNote: "Checkout + payments",
        progress: 62,
        sortOrder: 0,
        links: [
          { kind: "staging", url: "https://staging.example.com" },
          { kind: "repo", url: "https://github.com/example/storefront" },
        ],
        update: "Checkout is on staging and taking test cards. Shipping rates land next.",
      },
      {
        name: "Brand Site",
        summary: "Marketing site refresh.",
        status: "review",
        phaseNote: "Awaiting copy sign-off",
        progress: 90,
        sortOrder: 1,
        links: [{ kind: "live", url: "https://example.com" }],
        update: "All pages are built. We need your sign-off on the About copy to ship.",
      },
    ],
  },
  {
    client: "Harbour Legal",
    projects: [
      {
        name: "Client Portal",
        summary: "Document sharing portal with per-matter access.",
        status: "discovery",
        phaseNote: "Mapping permissions model",
        progress: 15,
        sortOrder: 0,
        update: "Kickoff done. Working through who should see which matters.",
      },
    ],
  },
];

for (const entry of demo) {
  const clientId = await upsertClient(entry.client);
  for (const p of entry.projects) await upsertProject(clientId, p);
  console.log(`client: ${entry.client} (${entry.projects.length} projects)`);
}

console.log("\nSeed complete. Sign in at APP_URL with the owner email above.");
console.log("Invite client contacts from the admin view — no email is sent on invite.");
