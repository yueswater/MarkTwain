import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { DocumentService } from "./document.service";

export function registerDocumentController(service: DocumentService): void {
  handle(IpcChannel.DocumentList, () => service.list());
  handle(IpcChannel.DocumentGet, ({ id }) => service.get(id));
  handle(IpcChannel.DocumentSave, ({ id, text }) => service.save(id, text));
}
