import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The local /api/* bridge is added in Phase 2 (vite-plugin-api.js).
export default defineConfig({
  plugins: [react()],
});
