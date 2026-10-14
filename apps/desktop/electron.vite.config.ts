import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

// main and preload depend on TypeScript sources inside the workspace and must be bundled,
// so the externalize plugin is not used. SQLite is node:sqlite, built into Node,
// so no native module needs handling.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: { alias: { "@": resolve("src/renderer/src") } },
    plugins: [react(), tailwindcss()],
  },
});
