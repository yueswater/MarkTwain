import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { VersionService } from "./version.service";

export function registerVersionController(service: VersionService): void {
  handle(IpcChannel.VersionStatus, () => service.status());
  handle(IpcChannel.VersionSave, ({ message }) => service.save(message));
  handle(IpcChannel.VersionBranchStart, ({ name }) => service.startBranch(name));
  handle(IpcChannel.VersionBranchSwitch, ({ name }) => service.switchBranch(name));
  handle(IpcChannel.VersionBranchDiscard, ({ name }) => service.discardBranch(name));
  handle(IpcChannel.VersionHistory, () => service.history());
  handle(IpcChannel.VersionRestore, ({ snapshotId, message }) => service.restore(snapshotId, message));
  handle(IpcChannel.VersionCompare, ({ from, to }) => service.compare(from, to));
  handle(IpcChannel.VersionMergePreview, ({ source }) => service.previewMerge(source));
  handle(IpcChannel.VersionMerge, ({ source, resolutions, deleteSource, message }) => service.merge(source, resolutions, deleteSource, message));
}
