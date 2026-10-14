import type { ConfigFields, ConfigIssue } from "@marktwain/schema";
import { IpcChannel } from "../enums/ipc-channel.enum";

export type ConfigState = { fields: ConfigFields; issues: ConfigIssue[] };

export type ConfigContract = {
  [IpcChannel.ConfigGet]: { req: void; res: ConfigState };
  /** Saves the form, incomplete fields are saved too, and returns which fields are still invalid */
  [IpcChannel.ConfigSet]: { req: { fields: ConfigFields }; res: ConfigState };
};
