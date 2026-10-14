import { IpcChannel } from "../enums/ipc-channel.enum";

export type DialogContract = {
  /** Chooses where a new project is stored, null when the user cancels */
  [IpcChannel.DialogChooseNewProject]: { req: { suggestedName: string }; res: string | null };
  /** Chooses a project file to open, null when the user cancels */
  [IpcChannel.DialogChooseOpenProject]: { req: void; res: string | null };
};
