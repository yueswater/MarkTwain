import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";

/**
 * 應用程式的生命週期。`registrars` 由入口（組合根）傳入，
 * 讓 core 不必依賴任何 feature。
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
