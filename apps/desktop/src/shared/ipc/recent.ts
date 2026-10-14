import { IpcChannel } from "../enums/ipc-channel.enum";

export type RecentProject = {
  path: string;
  name: string;
  openedAt: number;
  /** False when the file was moved or deleted */
  exists: boolean;
};

export type RecentContract = {
  [IpcChannel.RecentList]: { req: void; res: RecentProject[] };
  [IpcChannel.RecentRemove]: { req: { path: string }; res: RecentProject[] };
};
