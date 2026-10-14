import { BrowserWindow } from "electron";
import { join } from "node:path";
import { RENDERER_URL_ENV, WINDOW_SIZE } from "../config/app.config";

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    ...WINDOW_SIZE,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env[RENDERER_URL_ENV];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
  return win;
}
