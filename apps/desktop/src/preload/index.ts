import { contextBridge, ipcRenderer } from "electron";
import type { MarkTwainApi } from "../shared/ipc";

// 參數用寬鬆型別：型別檢查由 MarkTwainApi 的契約負責（呼叫端），
// 這裡只是把第一個參數轉送給 main。
const api: MarkTwainApi = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, args[0]),
};

contextBridge.exposeInMainWorld("marktwain", api);
