import { IpcChannel } from "../enums/ipc-channel.enum";

export type AssetContract = {
  /** Lets the user pick an image and stores it in the project, returns the path inside the project such as images/ab12.png, or null on cancel */
  [IpcChannel.AssetImportImage]: { req: void; res: { src: string } | null };
};
