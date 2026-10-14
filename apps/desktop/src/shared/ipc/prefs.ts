import { IpcChannel } from "../enums/ipc-channel.enum";
import type { EditorPrefs } from "../prefs";

export type PrefsContract = {
  [IpcChannel.PrefsGet]: { req: void; res: EditorPrefs };
  /** Applies a patch and returns the preferences that are now in effect */
  [IpcChannel.PrefsSet]: { req: { patch: Partial<EditorPrefs> }; res: EditorPrefs };
};
