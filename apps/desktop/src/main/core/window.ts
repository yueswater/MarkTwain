import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { HEADLESS_ENV, MIN_WINDOW_SIZE, RENDERER_URL_ENV, TEST_NO_ANIMATION_ENV, WINDOW_SIZE } from "../config/app.config";

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
    // Smaller than this the text column of the editor next to the sidebar and the preview is a few letters wide
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
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

  // A window that is not shown does not run an animation to its end, so a menu would stay half open for a test, and in a shown window a test would wait for each one. A test run has no opening and closing animation.
  if (headless || process.env[TEST_NO_ANIMATION_ENV] === "1") {
    win.webContents.on("did-finish-load", () => {
      void win.webContents.insertCSS("*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; }");
    });
  }

  const devUrl = process.env[RENDERER_URL_ENV];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
  return win;
}
