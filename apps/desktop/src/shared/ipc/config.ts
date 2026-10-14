import type { ConfigFields, ConfigIssue } from "@marktwain/schema";
import { IpcChannel } from "../enums/ipc-channel.enum";

export type ConfigState = { fields: ConfigFields; issues: ConfigIssue[] };

export type ConfigContract = {
  [IpcChannel.ConfigGet]: { req: void; res: ConfigState };
  /** 儲存表單；欄位不完整也會存（邊填邊存），回傳目前還有哪些欄位不合格 */
  [IpcChannel.ConfigSet]: { req: { fields: ConfigFields }; res: ConfigState };
};
