import type { IpcChannelName, IpcResponse, InvokeArgs } from "../../../shared/ipc";
import { IpcError } from "./ipc-error";

/** The only entry from the renderer to the back end, unwraps IpcResult and throws IpcError on failure. */
async function invoke<C extends IpcChannelName>(
  channel: C,
  ...args: InvokeArgs<C>
): Promise<IpcResponse<C>> {
  const result = await window.marktwain.invoke(channel, ...args);
  if (!result.ok) throw new IpcError(result.error);
  return result.data;
}

export const api = { invoke };
