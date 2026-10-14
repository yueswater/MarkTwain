import { ErrorCode } from "../../shared/enums/error-code.enum";
import type { IpcErrorPayload } from "../../shared/ipc";

/** 可以預期、要讓使用者看到訊息的錯誤。訊息由前端依 `code` 翻譯。 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly params: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "AppError";
  }
}

/** 轉成可以跨過 IPC 的形式。非 AppError 一律視為 unknown，不洩漏內部訊息。 */
export function toErrorPayload(error: unknown): IpcErrorPayload {
  if (error instanceof AppError) {
    return { code: error.code, params: error.params };
  }
  return { code: ErrorCode.Unknown, params: {} };
}
