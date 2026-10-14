import type { Database } from "../../infra/db";

/** Path of the BibTeX source in the files table and in the build directory. */
export const BIBLIOGRAPHY_PATH = "references.bib";

/** The bibliography source in the files table, as UTF-8 text. */
export class BibliographyRepository {
  constructor(private readonly db: Database) {}

  read(): string {
    const row = this.db.get<{ data: Uint8Array }>("SELECT data FROM files WHERE path = ?", [BIBLIOGRAPHY_PATH]);
    return row ? Buffer.from(row.data).toString("utf8") : "";
  }

  write(text: string, updatedAt: number): void {
    this.db.run(
      "INSERT INTO files (path, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      [BIBLIOGRAPHY_PATH, Buffer.from(text, "utf8"), updatedAt],
    );
  }
}
