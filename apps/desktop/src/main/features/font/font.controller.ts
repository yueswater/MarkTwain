import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { FontService } from "./font.service";

export function registerFontController(service: FontService): void {
  handle(IpcChannel.FontList, () => service.list());
  handle(IpcChannel.FontAdd, ({ files }) => service.add(files));
  handle(IpcChannel.FontBytes, ({ source, path }) => service.bytes(source, path));
  handle(IpcChannel.FontRemove, ({ family, force }) => service.remove(family, force));
}
