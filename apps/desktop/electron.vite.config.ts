import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

// main 與 preload 目前只依賴 workspace 內的 TypeScript 原始碼，需要被打包進去，
// 所以不使用 externalize 外掛。SQLite 使用 Node 內建的 `node:sqlite`，
// 不需要處理原生模組。
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: { alias: { "@": resolve("src/renderer/src") } },
    plugins: [react(), tailwindcss()],
  },
});
