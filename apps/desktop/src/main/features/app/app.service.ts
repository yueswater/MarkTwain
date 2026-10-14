import { APP_NAME } from "../../config/app.config";
import type { AppInfo } from "../../../shared/ipc";

export class AppService {
  getInfo(version: string, platform: string): AppInfo {
    return { name: APP_NAME, version, platform };
  }
}
