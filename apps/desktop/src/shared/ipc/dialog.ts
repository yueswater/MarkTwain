import { IpcChannel } from "../enums/ipc-channel.enum";

export type DialogContract = {
  /** 選擇新專案要存放的位置；使用者取消時回傳 null */
  [IpcChannel.DialogChooseNewProject]: { req: { suggestedName: string }; res: string | null };
  /** 選擇要開啟的專案檔；使用者取消時回傳 null */
  [IpcChannel.DialogChooseOpenProject]: { req: void; res: string | null };
};
