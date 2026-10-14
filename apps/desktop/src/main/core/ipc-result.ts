import type { IpcResult } from "../../shared/ipc";
import { AppError, toErrorPayload } from "./errors";

/** 執行 handler 並包成 IpcResult。未預期的錯誤寫到 console.error，回給前端的是 unknown。 */
export async function runHandler<Req, Res>(
  fn: (req: Req) => Res | Promise<Res>,
  req: Req,
): Promise<IpcResult<Res>> {
  try {
    return { ok: true, data: await fn(req) };
  } catch (error) {
    if (!(error instanceof AppError)) console.error(error);
    return { ok: false, error: toErrorPayload(error) };
  }
}
