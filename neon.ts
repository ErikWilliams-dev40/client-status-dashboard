import { defineConfig } from "@neon/config/v1";

// Database only: this project's handlers deploy to Vercel Edge (see vercel.json),
// and auth is the magic-link flow in api/auth/* — so no Neon Auth, no Neon
// Functions. The branch policy below is what earns this file its keep: scratch
// branches auto-expire, which is how db:push gets proven without touching
// production.
export default defineConfig({
  auth: false,
  branch: (branch) => {
    if (branch.isDefault) {
      // production: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches auto-expire. `neon checkout <name>` creates one.
      return { ttl: "7d" };
    }
    return {};
  },
});
