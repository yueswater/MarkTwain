import { IpcChannel } from "../enums/ipc-channel.enum";

export type ExportContract = {
  /** Saves the latest built PDF where the user chooses; null when cancelled */
  [IpcChannel.ExportPdf]: { req: void; res: { path: string } | null };
  /** Writes the whole Typst project, template included, into a new folder; null when cancelled */
  [IpcChannel.ExportProject]: { req: void; res: { path: string } | null };
};
