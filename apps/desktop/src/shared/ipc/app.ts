import { IpcChannel } from "../enums/ipc-channel.enum";

export type AppInfo = {
  name: string;
  version: string;
  platform: string;
};

export type AppContract = {
  [IpcChannel.AppInfo]: { req: void; res: AppInfo };
};
