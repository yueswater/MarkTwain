import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { ToolchainService } from "./toolchain.service";

export function registerToolchainController(service: ToolchainService): void {
  handle(IpcChannel.ToolchainStatus, async () => ({ latex: await service.latex() }));
}
