import type { TFunction } from "i18next";
import { IpcError } from "./ipc-error";

/** 把錯誤轉成目前語言的文字；沒有對應代碼的錯誤一律顯示 unknown。 */
export function errorMessage(t: TFunction, error: unknown): string {
  if (error instanceof IpcError) {
    return t(`error.${error.payload.code}`, { ns: "diagnostics", ...error.payload.params });
  }
  return t("error.app.unknown", { ns: "diagnostics" });
}
