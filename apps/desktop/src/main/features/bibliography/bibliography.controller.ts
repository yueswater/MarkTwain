import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { BibliographyService } from "./bibliography.service";

export function registerBibliographyController(service: BibliographyService): void {
  handle(IpcChannel.BibliographyGet, () => service.view());
  handle(IpcChannel.BibliographySetText, ({ text }) => service.setText(text));
  handle(IpcChannel.BibliographyUpsert, ({ entry, originalKey }) => service.upsert(entry, originalKey));
  handle(IpcChannel.BibliographyRemove, ({ key }) => service.remove(key));
  handle(IpcChannel.BibliographyImport, ({ name, text }) => service.import(name, text));
}
