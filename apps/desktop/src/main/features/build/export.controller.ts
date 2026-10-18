import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { DialogService } from "../dialog/dialog.service";
import type { BuildService } from "./build.service";

export function registerExportController(build: BuildService, dialogs: DialogService): void {
  handle(IpcChannel.ExportPdf, async () => {
    const path = await dialogs.choosePdfPath(build.suggestedName());
    if (!path) return null;
    await build.savePdf(path);
    return { path };
  });

  handle(IpcChannel.ExportFinalPdf, async () => {
    const path = await dialogs.choosePdfPath(`${build.suggestedName()}`);
    if (!path) return null;
    await build.savePdf(path, true);
    return { path };
  });

  handle(IpcChannel.ExportMarkdown, async () => {
    const path = await dialogs.chooseZipPath(build.markdownArchiveName());
    return path ? { path: await build.exportMarkdown(path) } : null;
  });

  handle(IpcChannel.ExportProject, async () => {
    const path = await dialogs.chooseZipPath(build.projectArchiveName());
    return path ? { path: await build.exportProject(path) } : null;
  });
}
