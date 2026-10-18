import { IpcChannel } from "../enums/ipc-channel.enum";

export type ExportContract = {
  /** Saves the latest built PDF where the user chooses; null when cancelled */
  [IpcChannel.ExportPdf]: { req: void; res: { path: string } | null };
  /** Builds a final copy with the watermark and saves it where the user chooses; null when cancelled */
  [IpcChannel.ExportFinalPdf]: { req: void; res: { path: string } | null };
  /** Writes the whole project of its engine, template included, into a zip that the user chooses; null when cancelled */
  [IpcChannel.ExportProject]: { req: void; res: { path: string } | null };
};
