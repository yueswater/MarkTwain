import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";

/**
 * App lifecycle. The entry point passes registrars in,
 * so core never depends on a feature.
 */
export function bootstrap(registrars: Array<() => void>): void {
  void app.whenReady().then(() => {
    for (const register of registrars) register();
    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
