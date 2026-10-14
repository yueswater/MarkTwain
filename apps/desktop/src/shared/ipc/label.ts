import { IpcChannel } from "../enums/ipc-channel.enum";

/** 可以被交叉引用的目標（只含有標籤的）。 */
export type LabelTarget = {
  label: string;
  /** 標籤的前綴：cha、sec、fig、tbl、eq、lst */
  kind: string;
  /** 引用時顯示的編號或標題 */
  display: string;
  documentId: string;
};

export type LabelIndex = {
  /** 標籤對應的顯示文字（編號或標題） */
  numbers: Record<string, string>;
  /** 被引用但不存在的標籤 */
  broken: string[];
  /** 定義了不只一次的標籤 */
  duplicates: string[];
  targets: LabelTarget[];
};

export type LabelContract = {
  /** 掃描專案裡已儲存的所有文件，回傳標籤、編號與錯誤 */
  [IpcChannel.LabelResolve]: { req: void; res: LabelIndex };
};
