import type { ErrorCode } from "../enums/error-code.enum";

export type IpcErrorPayload = {
  code: ErrorCode;
  params: Record<string, string | number>;
};

/**
 * 每個 IPC 呼叫的回傳外殼。錯誤以代碼與參數的形式跨過行程邊界（規格 3.5 節），
 * 由前端翻成目前語言的文字。
 */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload };
