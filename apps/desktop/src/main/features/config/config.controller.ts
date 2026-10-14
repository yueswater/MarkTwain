import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { ConfigService } from "./config.service";

export function registerConfigController(service: ConfigService): void {
  handle(IpcChannel.ConfigGet, () => service.get());
  handle(IpcChannel.ConfigGetAdvanced, () => service.advanced());
  handle(IpcChannel.ConfigSetAdvanced, ({ values }) => service.setAdvanced(values));
  handle(IpcChannel.ConfigSet, ({ fields }) => service.set(fields));
}
