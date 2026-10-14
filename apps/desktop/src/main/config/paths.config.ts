import { app } from "electron";
import { join } from "node:path";
import { SETTINGS_FILE_NAME } from "./app.config";

/** App level settings file, not part of any project. */
export function settingsFilePath(): string {
  return join(app.getPath("userData"), SETTINGS_FILE_NAME);
}
