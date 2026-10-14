import type { Locale } from "../enums/locale.enum";
import { IpcChannel } from "../enums/ipc-channel.enum";

export type LocaleView = {
  /** 使用者的設定；null 表示跟隨作業系統 */
  setting: Locale | null;
  /** 實際使用的語言 */
  effective: Locale;
};

export type SettingsContract = {
  [IpcChannel.SettingsGetLocale]: { req: void; res: LocaleView };
  [IpcChannel.SettingsSetLocale]: { req: { setting: Locale | null }; res: LocaleView };
};
