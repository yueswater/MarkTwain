import type { AppContract } from "./app";
import type { DialogContract } from "./dialog";
import type { DocumentContract } from "./document";
import type { ProjectContract } from "./project";
import type { IpcResult } from "./result";
import type { SettingsContract } from "./settings";

export type { AppInfo } from "./app";
export type { IpcErrorPayload, IpcResult } from "./result";
export type { LocaleView } from "./settings";
export type { DocumentData, DocumentSummary } from "./document";
export type { ProjectInfo } from "./project";

/** 所有功能的契約合併於此；新增 feature 時在這裡加 `& XxxContract`。 */
export type IpcContract = AppContract & SettingsContract & ProjectContract & DocumentContract & DialogContract;

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
};
