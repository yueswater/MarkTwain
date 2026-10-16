import type { Migration } from "../migrate";

/**
 * Versions of the project. The content of a snapshot is kept by hash, so a block, a file or a whole sequence of blocks that did not change
 * is stored once, however many snapshots hold it.
 */
export const versioning: Migration = {
  version: 2,
  name: "versioning",
  sql: `
    -- The text of a block. It never changes, the hash is of the text.
    CREATE TABLE blocks (
      hash TEXT PRIMARY KEY,
      text TEXT NOT NULL
    );

    -- The bytes of a file of the project.
    CREATE TABLE blobs (
      hash TEXT PRIMARY KEY,
      data BLOB NOT NULL
    );

    -- The blocks of a document in order, as a JSON list of hashes. A document that did not change between two snapshots shares its row.
    CREATE TABLE sequences (
      hash TEXT PRIMARY KEY,
      blocks TEXT NOT NULL
    );

    CREATE TABLE snapshots (
      id TEXT PRIMARY KEY,
      parent_id TEXT REFERENCES snapshots (id),
      parent2_id TEXT REFERENCES snapshots (id),
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE snap_docs (
      snapshot_id TEXT NOT NULL REFERENCES snapshots (id) ON DELETE CASCADE,
      doc_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      sequence_hash TEXT NOT NULL REFERENCES sequences (hash),
      PRIMARY KEY (snapshot_id, doc_id)
    );

    CREATE TABLE snap_files (
      snapshot_id TEXT NOT NULL REFERENCES snapshots (id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      blob_hash TEXT NOT NULL REFERENCES blobs (hash),
      PRIMARY KEY (snapshot_id, path)
    );

    CREATE TABLE branches (
      name TEXT PRIMARY KEY,
      head_id TEXT NOT NULL REFERENCES snapshots (id),
      base_id TEXT NOT NULL REFERENCES snapshots (id),
      created_at INTEGER NOT NULL
    );

    -- What was being typed on a branch that was left with changes that were not saved as a version. It is not in the history.
    CREATE TABLE drafts (
      branch TEXT PRIMARY KEY REFERENCES branches (name) ON DELETE CASCADE,
      content TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- The branch that the documents belong to now.
    CREATE TABLE version_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `,
};
