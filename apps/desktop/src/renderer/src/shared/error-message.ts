import type { TFunction } from "i18next";
import { IpcError } from "./ipc-error";

/** Turns an error into text in the current language, errors without a known code always show unknown. */
export function errorMessage(t: TFunction, error: unknown): string {
  if (error instanceof IpcError) {
    return t(`error.${error.payload.code}`, { ns: "diagnostics", ...error.payload.params });
  }
  return t("error.app.unknown", { ns: "diagnostics" });
}
