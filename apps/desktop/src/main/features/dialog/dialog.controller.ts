import { app, BrowserWindow, dialog } from "electron";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { TEST_DIALOG_PATH_ENV, TEST_EXPORT_PATH_ENV, TEST_IMAGE_PATH_ENV } from "../../config/app.config";
import { settingsFilePath } from "../../config/paths.config";
import { handle } from "../../core/ipc";
import { translatorFor } from "../../core/translator";
import { describeLocale } from "../../helpers/locale.helper";
import { SettingsRepository } from "../settings/settings.repository";
import { DialogService, type DialogPort } from "./dialog.service";

const port: DialogPort = {
  async showSave(options) {
    const window = BrowserWindow.getFocusedWindow() ?? undefined;
    const result = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options);
    return result.canceled || !result.filePath ? null : result.filePath;
  },
  async showOpen(options) {
    const properties: ("openFile")[] = ["openFile"];
    const window = BrowserWindow.getFocusedWindow() ?? undefined;
    const full = { ...options, properties };
    const result = window
      ? await dialog.showOpenDialog(window, full)
      : await dialog.showOpenDialog(full);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  },
};

export function registerDialogController(): DialogService {
  const settings = new SettingsRepository(settingsFilePath());
  const service = new DialogService(
    port,
    () =>
      translatorFor(describeLocale(app.getLocale(), settings.read().locale).effective, "dialog"),
    () => process.env[TEST_DIALOG_PATH_ENV] || undefined,
    () => process.env[TEST_IMAGE_PATH_ENV] || undefined,
    () => process.env[TEST_EXPORT_PATH_ENV] || undefined,
  );

  handle(IpcChannel.DialogForcedProjectPath, () => service.forcedProjectPath());
  return service;
}
