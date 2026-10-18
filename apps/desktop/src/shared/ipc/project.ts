import { IpcChannel } from "../enums/ipc-channel.enum";
import type { DocumentSummary } from "./document";

/** What a project is written for, chosen when it is created and never changed. Word is not available yet. */
export type OutputEngine = "typst" | "latex";

export type ProjectInfo = {
  name: string;
  path: string;
  engine: OutputEngine;
  documents: DocumentSummary[];
};

export type ProjectContract = {
  [IpcChannel.ProjectCreate]: { req: { path: string; name: string; engine: OutputEngine }; res: ProjectInfo };
  [IpcChannel.ProjectOpen]: { req: { path: string }; res: ProjectInfo };
  [IpcChannel.ProjectCurrent]: { req: void; res: ProjectInfo | null };
  [IpcChannel.ProjectClose]: { req: void; res: void };
  /** Opens the project that was open when the app last quit, null when there is none */
  [IpcChannel.ProjectResume]: { req: void; res: ProjectInfo | null };
};
