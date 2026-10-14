import { IpcChannel } from "../enums/ipc-channel.enum";
import type { DocumentSummary } from "./document";

export type ProjectInfo = {
  name: string;
  path: string;
  documents: DocumentSummary[];
};

export type ProjectContract = {
  [IpcChannel.ProjectCreate]: { req: { path: string; name: string }; res: ProjectInfo };
  [IpcChannel.ProjectOpen]: { req: { path: string }; res: ProjectInfo };
  [IpcChannel.ProjectCurrent]: { req: void; res: ProjectInfo | null };
  [IpcChannel.ProjectClose]: { req: void; res: void };
};
