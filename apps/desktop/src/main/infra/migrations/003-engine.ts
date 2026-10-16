import type { Migration } from "../migrate";

/**
 * The output engine of a project, chosen when it is created and never changed. A project that exists before this
 * version was made for Typst, which is the only output it ever had.
 */
export const engine: Migration = {
  version: 3,
  name: "engine",
  sql: `
    ALTER TABLE project ADD COLUMN engine TEXT NOT NULL DEFAULT 'typst';
  `,
};
