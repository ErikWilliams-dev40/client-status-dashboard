// Run a .sql file against DATABASE_URL.
//   node --env-file=.env scripts/db.mjs db/schema.sql
//
// Uses Pool (WebSocket) rather than the neon() HTTP driver because HTTP is
// single-statement only, and a schema file is many statements. Node 22 supplies
// the global WebSocket, so there is no `ws` dependency.
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = globalThis.WebSocket;

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/db.mjs <file.sql>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (did you pass --env-file=.env?)");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  // No params -> simple query protocol -> multiple statements in one round trip.
  await pool.query(sql);
  console.log(`applied ${file}`);
} catch (err) {
  console.error(`failed to apply ${file}:`);
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
