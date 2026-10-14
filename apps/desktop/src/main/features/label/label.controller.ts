import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { LabelService } from "./label.service";

export function registerLabelController(service: LabelService): void {
  handle(IpcChannel.LabelResolve, () => service.resolve());
}
