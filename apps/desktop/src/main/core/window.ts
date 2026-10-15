import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { HEADLESS_ENV, RENDERER_URL_ENV, WINDOW_SIZE } from "../config/app.config";

/** Window icon for Windows and Linux, macOS uses the app icon. Packaged as resources/icon.png. */
function windowIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(app.getAppPath(), "build", "icon.png");
}

export function createMainWindow(): BrowserWindow {
  const headless = process.env[HEADLESS_ENV] === "1";
  // The window of a test run still exists and renders, it is only not put on the screen
  if (headless) app.dock?.hide();
  const win = new BrowserWindow({
    ...WINDOW_SIZE,
    show: !headless,
    icon: windowIconPath(),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // A link in the page or in the PDF preview opens in the browser of the computer, and only web addresses do
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env[RENDERER_URL_ENV];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
  return win;
}
