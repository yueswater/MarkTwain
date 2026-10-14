import type { Locale } from "../enums/locale.enum";
import { IpcChannel } from "../enums/ipc-channel.enum";

export type LocaleView = {
  /** Setting of the user, null follows the OS */
  setting: Locale | null;
  /** Language actually used */
  effective: Locale;
};

export type SettingsContract = {
  [IpcChannel.SettingsGetLocale]: { req: void; res: LocaleView };
  [IpcChannel.SettingsSetLocale]: { req: { setting: Locale | null }; res: LocaleView };
};
