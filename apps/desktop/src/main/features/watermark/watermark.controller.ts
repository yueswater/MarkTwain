import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { DialogService } from "../dialog/dialog.service";
import type { WatermarkService } from "./watermark.service";

export function registerWatermarkController(service: WatermarkService, dialogs: DialogService): void {
  handle(IpcChannel.WatermarkGet, () => service.info());
  handle(IpcChannel.WatermarkChoose, () => service.choose(dialogs));
}
