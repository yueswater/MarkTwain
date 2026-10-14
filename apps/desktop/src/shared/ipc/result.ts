import type { ErrorCode } from "../enums/error-code.enum";

export type IpcErrorPayload = {
  code: ErrorCode;
  params: Record<string, string | number>;
};

/**
 * Wrapper of every IPC response. Errors cross the process boundary as a code with parameters, see section 3.5 of the spec,
 * and the renderer translates them into the current language.
 */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload };
