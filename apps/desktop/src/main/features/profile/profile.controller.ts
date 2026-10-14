import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { TEST_NO_PROFILE_DIALOG_ENV } from "../../config/app.config";
import { handle } from "../../core/ipc";
import type { ProfileService } from "./profile.service";

export function registerProfileController(service: ProfileService): void {
  // A test can turn the question off without touching the settings file
  handle(IpcChannel.ProfileGet, () => (process.env[TEST_NO_PROFILE_DIALOG_ENV] === "1" ? { ...service.get(), ask: false } : service.get()));
  handle(IpcChannel.ProfileSet, ({ patch }) => service.set(patch));
}
