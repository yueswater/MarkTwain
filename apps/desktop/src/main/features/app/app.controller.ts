import { app } from "electron";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import { AppService } from "./app.service";

export function registerAppController(): void {
  const service = new AppService();
  handle(IpcChannel.AppInfo, () => service.getInfo(app.getVersion(), process.platform));
}
