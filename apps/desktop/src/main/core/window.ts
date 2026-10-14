import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { RENDERER_URL_ENV, WINDOW_SIZE } from "../config/app.config";

/** Windows 與 Linux 的視窗圖示（macOS 用 .app 的圖示）。打包後放在 resources/icon.png。 */
function windowIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(app.getAppPath(), "build", "icon.png");
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    ...WINDOW_SIZE,
    icon: windowIconPath(),
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
