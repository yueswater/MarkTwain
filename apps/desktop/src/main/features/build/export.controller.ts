import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { BuildService } from "./build.service";

/** The files of an export are put where the picker of the app says, so nothing here asks the person for a place. */
export function registerExportController(build: BuildService): void {
  handle(IpcChannel.ExportNames, () => ({ pdf: build.suggestedName(), project: build.projectArchiveName(), markdown: build.markdownArchiveName() }));

  handle(IpcChannel.ExportPdf, async ({ path }) => {
    await build.savePdf(path);
    return { path };
  });

  handle(IpcChannel.ExportFinalPdf, async ({ path }) => {
    await build.savePdf(path, true);
    return { path };
  });

  handle(IpcChannel.ExportMarkdown, async ({ path }) => ({ path: await build.exportMarkdown(path) }));

  handle(IpcChannel.ExportProject, async ({ path }) => ({ path: await build.exportProject(path) }));
}
