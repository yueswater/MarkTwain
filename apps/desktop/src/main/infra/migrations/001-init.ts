import type { Migration } from "../migrate";

export const init: Migration = {
  version: 1,
  name: "init",
  sql: `
    CREATE TABLE project (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX documents_order ON documents (kind, position);

    CREATE TABLE files (
      path TEXT PRIMARY KEY,
      data BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,
};
