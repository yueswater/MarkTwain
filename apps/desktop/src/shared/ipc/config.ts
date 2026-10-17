import type { AdvancedValue, AdvancedValues, ConfigFields, ConfigIssue, SchoolTerms } from "@marktwain/schema";
import { IpcChannel } from "../enums/ipc-channel.enum";

export type ConfigState = { fields: ConfigFields; issues: ConfigIssue[] };

export type AdvancedState = {
  /** Overrides set in config.yml, by path */
  values: AdvancedValues;
  /** What a field is without an override, from the template and the school preset */
  inherited: AdvancedValues;
  /** The names of the lists at the front of the thesis in the rules of the school */
  terms: SchoolTerms;
};

export type ConfigContract = {
  [IpcChannel.ConfigGetAdvanced]: { req: void; res: AdvancedState };
  /** Sets the paths that have a value and removes the paths that are null */
  [IpcChannel.ConfigSetAdvanced]: { req: { values: Record<string, AdvancedValue | null> }; res: AdvancedState };
  [IpcChannel.ConfigGet]: { req: void; res: ConfigState };
  /** Saves the form, incomplete fields are saved too, and returns which fields are still invalid */
  [IpcChannel.ConfigSet]: { req: { fields: ConfigFields }; res: ConfigState };
};
