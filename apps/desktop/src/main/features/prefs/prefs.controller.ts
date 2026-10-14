import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { PrefsService } from "./prefs.service";

export function registerPrefsController(service: PrefsService): void {
  handle(IpcChannel.PrefsGet, () => service.get());
  handle(IpcChannel.PrefsSet, ({ patch }) => service.set(patch));
}
