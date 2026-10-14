import type { Database } from "../../infra/db";

/** files 資料表的讀寫：專案內的二進位檔（圖片等）。 */
export class AssetRepository {
  constructor(private readonly db: Database) {}

  put(path: string, data: Uint8Array, updatedAt: number): void {
    this.db.run(
      "INSERT INTO files (path, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      [path, data, updatedAt],
    );
  }

  get(path: string): Uint8Array | undefined {
    return this.db.get<{ data: Uint8Array }>("SELECT data FROM files WHERE path = ?", [path])?.data;
  }
}
