import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { apiRoutes } from "./vite-plugin-api.js";

export default defineConfig(({ mode }) => {
  // Load .env without the VITE_ prefix filter: these are server-side secrets,
  // consumed by api/ handlers via process.env, never exposed to the client.
  const env = loadEnv(mode, process.cwd(), "");
  return { plugins: [react(), apiRoutes(env)] };
});
