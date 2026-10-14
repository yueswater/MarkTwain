import { ipcMain } from "electron";
import type { IpcChannelName, IpcRequest, IpcResponse } from "../../shared/ipc";
import { runHandler } from "./ipc-result";

/** The only way the back end registers IPC. The contract checks arguments and results, errors are wrapped in IpcResult. */
export function handle<C extends IpcChannelName>(
  channel: C,
  fn: (req: IpcRequest<C>) => IpcResponse<C> | Promise<IpcResponse<C>>,
): void {
  ipcMain.handle(channel, (_event, req: IpcRequest<C>) => runHandler(fn, req));
}
