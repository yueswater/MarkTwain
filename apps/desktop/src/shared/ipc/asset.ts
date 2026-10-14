import { IpcChannel } from "../enums/ipc-channel.enum";

export type AssetContract = {
  /** 讓使用者選一張圖片並存進專案；回傳專案內的路徑（例如 images/ab12….png），取消時回傳 null */
  [IpcChannel.AssetImportImage]: { req: void; res: { src: string } | null };
};
