import { app } from "electron";
import { join } from "node:path";
import { SETTINGS_FILE_NAME } from "./app.config";

/** 應用程式層級的設定檔（不屬於任何專案）。 */
export function settingsFilePath(): string {
  return join(app.getPath("userData"), SETTINGS_FILE_NAME);
}
