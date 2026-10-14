import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { ProjectService } from "./project.service";

export function registerProjectController(service: ProjectService): void {
  handle(IpcChannel.ProjectCreate, ({ path, name }) => service.create(path, name));
  handle(IpcChannel.ProjectOpen, ({ path }) => service.open(path));
  handle(IpcChannel.ProjectCurrent, () => service.current());
  handle(IpcChannel.ProjectClose, () => service.close());
}
