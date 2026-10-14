import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// main 與 preload 目前只依賴 workspace 內的 TypeScript 原始碼，需要被打包進去，
// 所以不使用 externalize 外掛。之後加入 better-sqlite3 這類原生模組時，
// 才把它列為 external。
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
  },
});
