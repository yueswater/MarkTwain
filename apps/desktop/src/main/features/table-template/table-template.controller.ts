import { app } from "electron";
import { join, resolve } from "node:path";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { TableTemplateService } from "./table-template.service";

/** The folder of the table templates, next to the app when it is installed and in the repository while it is developed. */
export function tableTemplatesFolder(): string {
  return app.isPackaged ? join(process.resourcesPath, "table-templates") : resolve(app.getAppPath(), "../..", "resources", "table-templates");
}

export function registerTableTemplateController(service: TableTemplateService): void {
  handle(IpcChannel.TableTemplateList, ({ language }) => service.list(language));
  handle(IpcChannel.TableTemplateBuild, ({ id, language, params }) => service.build(id, language, params));
}
