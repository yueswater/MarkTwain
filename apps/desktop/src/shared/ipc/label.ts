import { IpcChannel } from "../enums/ipc-channel.enum";

/** Targets that can be cross-referenced, only labeled ones. */
export type LabelTarget = {
  label: string;
  /** Prefix of the label, one of cha, sec, fig, tbl, eq and lst */
  kind: string;
  /** Number or title shown when referencing */
  display: string;
  documentId: string;
};

export type LabelIndex = {
  /** Display text of a label, a number or a title */
  numbers: Record<string, string>;
  /** Labels that are referenced but do not exist */
  broken: string[];
  /** Labels defined more than once */
  duplicates: string[];
  targets: LabelTarget[];
};

export type LabelContract = {
  /** Scans all saved documents of the project and returns labels, numbers and errors */
  [IpcChannel.LabelResolve]: { req: void; res: LabelIndex };
};
