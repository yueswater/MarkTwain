import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { TEST_PICKER_START_ENV } from "../../config/app.config";
import { handle } from "../../core/ipc";
import { FilesService } from "./files.service";

export function registerFilesController(): FilesService {
  const service = new FilesService({ start: () => process.env[TEST_PICKER_START_ENV] || undefined });
  handle(IpcChannel.FilesList, ({ path, extension }) => service.list(path, extension));
  handle(IpcChannel.FilesMakeFolder, ({ parent, name }) => service.makeFolder(parent, name));
  return service;
}
