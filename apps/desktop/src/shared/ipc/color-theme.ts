import type { ColorTheme } from "@marktwain/schema";
import { IpcChannel } from "../enums/ipc-channel.enum";

/** A theme with where it comes from, the ones that come with the app cannot be removed. */
export type ColorThemeView = ColorTheme & { builtin: boolean };

export type ColorThemeContract = {
  /** The themes of the app first, then those that the person added */
  [IpcChannel.ColorThemeList]: { req: void; res: ColorThemeView[] };
  /** Asks for a theme file, checks it and keeps a copy; null when cancelled */
  [IpcChannel.ColorThemeImport]: { req: void; res: ColorThemeView | null };
  /** Removes a theme that the person added */
  [IpcChannel.ColorThemeRemove]: { req: { id: string }; res: void };
};
