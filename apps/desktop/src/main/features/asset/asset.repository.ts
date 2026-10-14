import type { Database } from "../../infra/db";

/** Read and write of the files table, binary files of a project such as images. */
export class AssetRepository {
  constructor(private readonly db: Database) {}

  put(path: string, data: Uint8Array, updatedAt: number): void {
    this.db.run(
      "INSERT INTO files (path, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      [path, data, updatedAt],
    );
  }

  /** Every stored image, used to place images in a build directory. The settings and the bibliography have their own paths. */
  list(): { path: string; data: Uint8Array }[] {
    return this.db.all<{ path: string; data: Uint8Array }>("SELECT path, data FROM files WHERE path NOT IN ('config.yml', 'references.bib')");
  }

  get(path: string): Uint8Array | undefined {
    return this.db.get<{ data: Uint8Array }>("SELECT data FROM files WHERE path = ?", [path])?.data;
  }
}
