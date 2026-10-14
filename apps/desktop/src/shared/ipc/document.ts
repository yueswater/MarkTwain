import type { DocumentKind } from "../enums/document-kind.enum";
import { IpcChannel } from "../enums/ipc-channel.enum";

export type DocumentSummary = {
  id: string;
  kind: DocumentKind;
  /** 同一種類內的順序，從 1 開始 */
  position: number;
  /** 使用者自訂的標題；空字串表示使用預設（由介面依種類與順序產生） */
  title: string;
};

export type DocumentData = DocumentSummary & { text: string };

export type DocumentContract = {
  [IpcChannel.DocumentList]: { req: void; res: DocumentSummary[] };
  [IpcChannel.DocumentGet]: { req: { id: string }; res: DocumentData };
  [IpcChannel.DocumentSave]: { req: { id: string; text: string }; res: void };
};
