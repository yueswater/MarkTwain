import { ErrorCode } from "../../shared/enums/error-code.enum";
import type { IpcErrorPayload } from "../../shared/ipc";

/** An expected error whose message the user should see. The renderer translates it by code. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly params: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "AppError";
  }
}

/** Converts to a form that can cross IPC. Anything that is not an AppError becomes unknown so internals do not leak. */
export function toErrorPayload(error: unknown): IpcErrorPayload {
  if (error instanceof AppError) {
    return { code: error.code, params: error.params };
  }
  return { code: ErrorCode.Unknown, params: {} };
}
