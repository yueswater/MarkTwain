import { contextBridge, ipcRenderer } from "electron";
import type { MarkTwainApi } from "../shared/ipc";
import { MENU_COMMAND_CHANNEL, type MenuCommand } from "../shared/ipc/menu";

// Loose types for the arguments, the contract in MarkTwainApi checks types on the caller side.
// This only forwards the first argument to main.
const api: MarkTwainApi = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, args[0]),
  onMenuCommand: (listener: (command: MenuCommand) => void) => {
    const handler = (_event: unknown, command: MenuCommand) => listener(command);
    ipcRenderer.on(MENU_COMMAND_CHANNEL, handler);
    return () => ipcRenderer.removeListener(MENU_COMMAND_CHANNEL, handler);
  },
};

contextBridge.exposeInMainWorld("marktwain", api);
