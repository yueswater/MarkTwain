import { app, BrowserWindow, Menu } from "electron";
import { WEBSITE_URL } from "../../config/app.config";
import { settingsFilePath } from "../../config/paths.config";
import { buildAppMenu } from "../../core/app-menu";
import { translatorFor } from "../../core/translator";
import { describeLocale } from "../../helpers/locale.helper";
import { SettingsRepository } from "../settings/settings.repository";
import { MENU_COMMAND_CHANNEL, type MenuCommand } from "../../../shared/ipc/menu";

const settings = new SettingsRepository(settingsFilePath());

function send(command: MenuCommand): void {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  window?.webContents.send(MENU_COMMAND_CHANNEL, command);
}

/** Rebuilds the native menu in the current language, at startup and after a language change. */
export function applyAppMenu(): void {
  const { effective } = describeLocale(app.getLocale(), settings.read().locale);
  Menu.setApplicationMenu(
    buildAppMenu(translatorFor(effective, "menu"), { send, isDev: !app.isPackaged, websiteUrl: WEBSITE_URL }),
  );
}
