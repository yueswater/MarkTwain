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
  /** Labels that some document refers to, a name that is used cannot be changed or removed without breaking it */
  used: string[];
};

/** What a label points to, drawn small in the card that opens over a reference. */
export type LabelPreviewContent =
  | { type: "heading"; title: string; excerpt: string }
  | { type: "figure"; src: string; caption: string }
  | { type: "table"; caption: string; rows: string[][]; more: boolean }
  | { type: "formula"; latex: string }
  | { type: "code"; text: string; more: boolean; language: string; caption: string };

export type LabelPreview = {
  label: string;
  documentId: string;
  /** Index of the top level block that holds the target, to scroll to it */
  block: number;
  /** Where the target is, so the card can say it */
  document: { kind: string; position: number; title: string };
  content: LabelPreviewContent;
};

export type LabelContract = {
  /** The content that a label points to, null when no document has it */
  [IpcChannel.LabelPreview]: { req: { label: string }; res: LabelPreview | null };
  /** Scans all saved documents of the project and returns labels, numbers and errors */
  [IpcChannel.LabelResolve]: { req: void; res: LabelIndex };
};
