import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { DocumentService } from "./document.service";

export function registerDocumentController(service: DocumentService): void {
  handle(IpcChannel.DocumentList, () => service.list());
  handle(IpcChannel.DocumentGet, ({ id }) => service.get(id));
  handle(IpcChannel.DocumentSave, ({ id, text }) => service.save(id, text));
  handle(IpcChannel.DocumentCreate, ({ kind }) => service.create(kind));
  handle(IpcChannel.DocumentDelete, ({ id }) => service.remove(id));
  handle(IpcChannel.DocumentMove, ({ id, delta }) => service.move(id, delta));
  handle(IpcChannel.DocumentReorder, ({ id, targetId, placement }) => service.reorder(id, targetId, placement));
  handle(IpcChannel.DocumentRename, ({ id, title }) => service.rename(id, title));
}
