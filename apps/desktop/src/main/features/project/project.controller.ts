import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { RecentService } from "../recent/recent.service";
import type { ProjectService } from "./project.service";

export function registerProjectController(service: ProjectService, recent: RecentService): void {
  handle(IpcChannel.ProjectCreate, ({ path, name }) => {
    const info = service.create(path, name);
    recent.record(path, info.name);
    return info;
  });
  handle(IpcChannel.ProjectOpen, ({ path }) => {
    const info = service.open(path);
    recent.record(path, info.name);
    return info;
  });
  handle(IpcChannel.ProjectCurrent, () => service.current());
  handle(IpcChannel.ProjectClose, () => {
    service.close();
    recent.clearLast();
  });
  handle(IpcChannel.ProjectResume, () => {
    const path = recent.lastPath();
    if (!path) return null;
    try {
      const info = service.open(path);
      recent.record(path, info.name);
      return info;
    } catch {
      // A damaged or newer file should not block the start, the user sees it in the list
      recent.clearLast();
      return null;
    }
  });
  handle(IpcChannel.RecentList, () => recent.list());
  handle(IpcChannel.RecentRemove, ({ path }) => recent.remove(path));
}
