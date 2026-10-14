import type { IpcErrorPayload } from "../../../shared/ipc";

/** 後端回傳的失敗結果，在前端解開後以例外的形式丟出。訊息由 `errorMessage` 翻譯。 */
export class IpcError extends Error {
  constructor(readonly payload: IpcErrorPayload) {
    super(payload.code);
    this.name = "IpcError";
  }
}
