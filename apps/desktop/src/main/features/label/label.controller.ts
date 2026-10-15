import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { LabelService } from "./label.service";

export function registerLabelController(service: LabelService): void {
  handle(IpcChannel.LabelResolve, () => service.resolve());
  handle(IpcChannel.LabelPreview, ({ label }) => service.preview(label));
  handle(IpcChannel.LabelReferences, ({ label }) => service.references(label));
  handle(IpcChannel.LabelUnlabeled, ({ exceptDocumentId }) => service.unlabeled(exceptDocumentId));
  handle(IpcChannel.LabelEnsure, ({ documentId, block, kind }) => service.ensure(documentId, block, kind));
}
