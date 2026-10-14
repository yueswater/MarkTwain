import type { AppContract } from "./app";
import type { BuildContract } from "./build";
import type { ExportContract } from "./export";
import type { ConfigContract } from "./config";
import type { DialogContract } from "./dialog";
import type { DocumentContract } from "./document";
import type { MenuCommand } from "./menu";
import type { AssetContract } from "./asset";
import type { LabelContract } from "./label";
import type { ProjectContract } from "./project";
import type { IpcResult } from "./result";
import type { SettingsContract } from "./settings";

export type { AppInfo } from "./app";
export type { IpcErrorPayload, IpcResult } from "./result";
export type { LocaleView } from "./settings";
export type { DocumentData, DocumentSummary } from "./document";
export type { ProjectInfo } from "./project";
export type { BuildDiagnostic, BuildOutcome } from "./build";
export type { ConfigState } from "./config";
export type { LabelIndex, LabelTarget } from "./label";

/** 所有功能的契約合併於此；新增 feature 時在這裡加 `& XxxContract`。 */
export type IpcContract = AppContract & SettingsContract & ProjectContract & DocumentContract & DialogContract & LabelContract & AssetContract & ConfigContract & BuildContract & ExportContract;

export type IpcChannelName = keyof IpcContract;
export type IpcRequest<C extends IpcChannelName> = IpcContract[C]["req"];
export type IpcResponse<C extends IpcChannelName> = IpcContract[C]["res"];

/** 請求型別為 void 的 channel 不需要傳第二個參數。 */
export type InvokeArgs<C extends IpcChannelName> = IpcRequest<C> extends void
  ? []
  : [req: IpcRequest<C>];

/** preload 暴露給前端的唯一 API；回傳 IpcResult，由前端的 `api` 包裝解開。 */
export type MarkTwainApi = {
  invoke<C extends IpcChannelName>(
    channel: C,
    ...args: InvokeArgs<C>
  ): Promise<IpcResult<IpcResponse<C>>>;
  /** 訂閱原生選單的指令；回傳取消訂閱的函式 */
  onMenuCommand(listener: (command: MenuCommand) => void): () => void;
};
