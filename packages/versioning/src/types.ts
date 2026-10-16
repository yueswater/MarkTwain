/** The hash of a block of text or of a file, a lowercase hex SHA-256. */
export type Hash = string;

/** A document of a snapshot: where it stands, how it is called, and its blocks in order. The text of a block is kept elsewhere, by its hash. */
export type DocumentEntry = {
  kind: string;
  title: string;
  position: number;
  blocks: Hash[];
};

/** What a snapshot holds: the documents by id and the files by path, each file by the hash of its bytes. */
export type SnapshotContent = {
  documents: Record<string, DocumentEntry>;
  files: Record<string, Hash>;
};

/** A saved version. A snapshot made by a merge has a second parent. */
export type Snapshot = {
  id: string;
  parentId: string | null;
  parent2Id: string | null;
  message: string;
  createdAt: number;
};

/** A named line of versions, from the snapshot where it started to its latest one. */
export type Branch = {
  name: string;
  headId: string;
  baseId: string;
  createdAt: number;
};

/** The name of the line that every project has and that cannot be discarded. */
export const MAIN_BRANCH = "main";
