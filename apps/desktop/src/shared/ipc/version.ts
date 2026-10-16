import { IpcChannel } from "../enums/ipc-channel.enum";

export type BranchInfo = {
  name: string;
  headId: string;
  /** The version where the branch started */
  baseId: string;
  createdAt: number;
  isCurrent: boolean;
  /** Whether changes that were not saved as a version wait on the branch, they are put back when it is opened */
  hasDraft: boolean;
};

export type VersionStatus = {
  /** The branch that the documents belong to now */
  branch: string;
  headId: string;
  /** Whether the documents differ from the latest version of the branch */
  dirty: boolean;
  branches: BranchInfo[];
};

export type VersionEntry = {
  id: string;
  message: string;
  createdAt: number;
  parentId: string | null;
  /** The second parent of a version made by a merge */
  parent2Id: string | null;
  /** The branches whose latest version this is */
  heads: string[];
};

/** A run of the comparison, blocks that did not change are one entry with their count. */
export type ChangeView =
  | { type: "same"; count: number }
  | { type: "added"; after: string }
  | { type: "removed"; before: string }
  | { type: "modified"; before: string; after: string };

export type DocumentDiffView = {
  docId: string;
  title: string;
  kind: string;
  status: "added" | "removed" | "changed";
  fields: { field: "kind" | "title" | "position"; from: string | number | null; to: string | number | null }[];
  changes: ChangeView[];
};

export type CompareView = {
  documents: DocumentDiffView[];
  files: { path: string; status: "added" | "removed" | "changed" }[];
};

/** A conflict of a merge with the text that each side has, to be shown side by side. */
export type ConflictView =
  | { id: string; type: "blocks"; docId: string; title: string; kind: string; base: string[]; ours: string[]; theirs: string[] }
  | { id: string; type: "field"; docId: string; title: string; kind: string; field: "kind" | "title" | "position"; base: string | number | null; ours: string | number; theirs: string | number }
  | { id: string; type: "file"; path: string; base: boolean; ours: boolean; theirs: boolean }
  | { id: string; type: "document"; docId: string; title: string; kind: string; deletedBy: "ours" | "theirs" };

/** The choice for a conflict. Blocks take the main line, the change that comes in, the base, both, or a text of your own. */
export type ChoiceInput = "ours" | "theirs" | "base" | "both" | "keep" | "delete" | { text: string };

export type MergePreview =
  /** The main line has everything that the branch has */
  | { kind: "up-to-date" }
  /** The main line has nothing that the branch lacks, so the branch only becomes the main line */
  | { kind: "fast-forward" }
  | { kind: "clean" }
  | { kind: "conflicts"; conflicts: ConflictView[] };

export type VersionContract = {
  [IpcChannel.VersionStatus]: { req: void; res: VersionStatus };
  [IpcChannel.VersionSave]: { req: { message: string }; res: VersionStatus };
  [IpcChannel.VersionBranchStart]: { req: { name: string }; res: VersionStatus };
  [IpcChannel.VersionBranchSwitch]: { req: { name: string }; res: VersionStatus };
  [IpcChannel.VersionBranchDiscard]: { req: { name: string }; res: VersionStatus };
  /** The versions that lead to the latest one of the branch that is open, newest first */
  [IpcChannel.VersionHistory]: { req: void; res: VersionEntry[] };
  /** The text of a document as it is in the latest version of the branch that is open, null when that version has no such document. The editor marks what differs from it. */
  [IpcChannel.VersionHeadText]: { req: { documentId: string }; res: string | null };
  /** Puts the documents back as they are in the latest version of the branch that is open, and throws away what was typed since */
  [IpcChannel.VersionDiscardChanges]: { req: void; res: VersionStatus };
  /** Makes the documents as they were in a version, and saves that as a new version, so the history is kept */
  [IpcChannel.VersionRestore]: { req: { snapshotId: string; message: string }; res: VersionStatus };
  [IpcChannel.VersionCompare]: { req: { from: string; to: string }; res: CompareView };
  [IpcChannel.VersionMergePreview]: { req: { source: string }; res: MergePreview };
  /** Merges a branch into the main line, all conflicts need a choice or nothing is written */
  [IpcChannel.VersionMerge]: { req: { source: string; resolutions: Record<string, ChoiceInput>; deleteSource: boolean; message: string }; res: VersionStatus };
};
