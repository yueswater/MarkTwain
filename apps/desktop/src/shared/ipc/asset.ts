import { IpcChannel } from "../enums/ipc-channel.enum";

export type AssetContract = {
  /** Stores PNG bytes made in the editor, for example a cropped picture, and returns the path inside the project */
  [IpcChannel.AssetStoreImage]: { req: { data: Uint8Array }; res: { src: string } };
  /** Lets the user pick an image and stores it in the project, returns the path inside the project such as images/ab12.png, or null on cancel */
  [IpcChannel.AssetImportImage]: { req: void; res: { src: string } | null };
};
