import { IpcChannel } from "../enums/ipc-channel.enum";

export type ExportContract = {
  /** The names that the files of an export are suggested with, the title of the thesis and what the file is */
  [IpcChannel.ExportNames]: { req: void; res: { pdf: string; project: string; markdown: string } };
  /** Builds the PDF and saves it at the path, which the picker of the app gave */
  [IpcChannel.ExportPdf]: { req: { path: string }; res: { path: string } };
  /** Builds a final copy with the watermark and saves it at the path */
  [IpcChannel.ExportFinalPdf]: { req: { path: string }; res: { path: string } };
  /** Writes the whole project of its engine, template included, into a zip at the path */
  [IpcChannel.ExportProject]: { req: { path: string }; res: { path: string } };
  /** Writes the Markdown of the documents with the images, the bibliography and the settings into a zip at the path */
  [IpcChannel.ExportMarkdown]: { req: { path: string }; res: { path: string } };
};
