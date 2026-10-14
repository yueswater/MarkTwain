import type { IpcErrorPayload } from "../../../shared/ipc";

/** A failed result of the back end, thrown as an exception in the renderer. The message is translated by errorMessage. */
export class IpcError extends Error {
  constructor(readonly payload: IpcErrorPayload) {
    super(payload.code);
    this.name = "IpcError";
  }
}
