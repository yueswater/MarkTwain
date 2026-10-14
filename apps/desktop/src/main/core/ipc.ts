import { ipcMain } from "electron";
import type { IpcChannelName, IpcRequest, IpcResponse } from "../../shared/ipc";
import { runHandler } from "./ipc-result";

/** 後端註冊 IPC 的唯一方式：參數與回傳值由契約檢查，錯誤統一包成 IpcResult。 */
export function handle<C extends IpcChannelName>(
  channel: C,
  fn: (req: IpcRequest<C>) => IpcResponse<C> | Promise<IpcResponse<C>>,
): void {
  ipcMain.handle(channel, (_event, req: IpcRequest<C>) => runHandler(fn, req));
}
