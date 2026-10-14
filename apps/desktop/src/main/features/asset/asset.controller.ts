import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { DialogService } from "../dialog/dialog.service";
import type { AssetService } from "./asset.service";

export function registerAssetController(service: AssetService, dialogs: DialogService): void {
  handle(IpcChannel.AssetStoreImage, ({ data }) => ({ src: service.storePng(data) }));
  handle(IpcChannel.AssetImportImage, async () => {
    const path = await dialogs.chooseImage();
    return path ? { src: service.importImage(path) } : null;
  });
}
