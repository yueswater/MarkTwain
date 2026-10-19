import type { IpcResult } from "../../shared/ipc";
import { describeError, log } from "../infra/logger";
import { AppError, toErrorPayload } from "./errors";

/** Runs a handler and wraps the result in IpcResult. Unexpected errors go to console.error and the log, and the renderer gets unknown. */
export async function runHandler<Req, Res>(
  fn: (req: Req) => Res | Promise<Res>,
  req: Req,
): Promise<IpcResult<Res>> {
  try {
    return { ok: true, data: await fn(req) };
  } catch (error) {
    if (!(error instanceof AppError)) console.error(error);
    log.error("ipc", describeError(error));
    return { ok: false, error: toErrorPayload(error) };
  }
}
