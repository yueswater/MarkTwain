import { app } from "electron";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { settingsFilePath } from "../../config/paths.config";
import { handle } from "../../core/ipc";
import { SettingsRepository } from "./settings.repository";
import { SettingsService } from "./settings.service";

export function registerSettingsController(): void {
  const service = new SettingsService(new SettingsRepository(settingsFilePath()));

  handle(IpcChannel.SettingsGetLocale, () => service.getLocale(app.getLocale()));
  handle(IpcChannel.SettingsSetLocale, ({ setting }) =>
    service.setLocale(setting, app.getLocale()),
  );
}
