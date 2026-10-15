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
  /** How many figures, tables, listings and blocks of a mathematical thesis come before each document, by label prefix, so the editor can number what has no label */
  bases: Record<string, Record<string, number>>;
  /** Labels that some document refers to, a name that is used cannot be changed or removed without breaking it */
  used: string[];
};

/** What a label points to, drawn small in the card that opens over a reference. */
export type LabelPreviewContent =
  | { type: "heading"; title: string; excerpt: string }
  | { type: "figure"; src: string; caption: string }
  | { type: "table"; caption: string; rows: string[][]; more: boolean }
  | { type: "formula"; latex: string }
  | { type: "statement"; kind: string; title: string; excerpt: string }
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

/** A place that refers to a label, the block that holds the reference and the start of its text. */
export type LabelReference = {
  documentId: string;
  /** Index of the top level block that holds the reference, to scroll to it */
  block: number;
  document: { kind: string; position: number; title: string };
  excerpt: string;
};

/** A block of another document that can be referenced but has no label yet, one is added when it is chosen. */
export type UnlabeledRemote = {
  documentId: string;
  /** Index of the top level block */
  block: number;
  /** Prefix of the label it would take */
  kind: string;
  /** Short description, such as the heading text or the caption */
  text: string;
  document: { kind: string; position: number; title: string };
};

export type LabelContract = {
  /** The blocks of the other documents that have no label, in the order of the documents */
  [IpcChannel.LabelUnlabeled]: { req: { exceptDocumentId: string | null }; res: UnlabeledRemote[] };
  /** Gives a block of a saved document a label, or returns the one it has, null when the block is gone or cannot be referenced */
  [IpcChannel.LabelEnsure]: { req: { documentId: string; block: number; kind: string }; res: { label: string } | null };
  /** The content that a label points to, null when no document has it */
  [IpcChannel.LabelPreview]: { req: { label: string }; res: LabelPreview | null };
  /** Scans all saved documents of the project and returns labels, numbers and errors */
  /** The places that refer to a label, in the order of the documents */
  [IpcChannel.LabelReferences]: { req: { label: string }; res: LabelReference[] };
  [IpcChannel.LabelResolve]: { req: void; res: LabelIndex };
};
