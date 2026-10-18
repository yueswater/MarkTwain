import { app } from "electron";
import { join, resolve } from "node:path";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { DialogService } from "../dialog/dialog.service";
import type { ColorThemeService } from "./color-theme.service";

/** The themes that come with the app, next to it when it is installed and in the repository while it is developed. */
export function colorThemesFolder(): string {
  return app.isPackaged ? join(process.resourcesPath, "color-themes") : resolve(app.getAppPath(), "../..", "resources", "color-themes");
}

/** The themes that the person added. */
export function userColorThemesFolder(): string {
  return join(app.getPath("userData"), "color-themes");
}

export function registerColorThemeController(service: ColorThemeService, dialogs: DialogService): void {
  handle(IpcChannel.ColorThemeList, () => service.list());
  handle(IpcChannel.ColorThemeImport, () => service.import(dialogs));
  handle(IpcChannel.ColorThemeRemove, ({ id }) => service.remove(id));
}
