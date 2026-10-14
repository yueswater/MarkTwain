import { contextBridge, ipcRenderer } from "electron";
import type { MarkTwainApi } from "../shared/ipc";
import { MENU_COMMAND_CHANNEL, type MenuCommand } from "../shared/ipc/menu";

// 參數用寬鬆型別：型別檢查由 MarkTwainApi 的契約負責（呼叫端），
// 這裡只是把第一個參數轉送給 main。
const api: MarkTwainApi = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, args[0]),
  onMenuCommand: (listener: (command: MenuCommand) => void) => {
    const handler = (_event: unknown, command: MenuCommand) => listener(command);
    ipcRenderer.on(MENU_COMMAND_CHANNEL, handler);
    return () => ipcRenderer.removeListener(MENU_COMMAND_CHANNEL, handler);
  },
};

contextBridge.exposeInMainWorld("marktwain", api);
