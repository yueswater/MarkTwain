import type { Database } from "../../infra/db";

const CONFIG_PATH = "config.yml";

/** The config.yml in the files table, as UTF-8 text. */
export class ConfigRepository {
  constructor(private readonly db: Database) {}

  read(): string | null {
    const row = this.db.get<{ data: Uint8Array }>("SELECT data FROM files WHERE path = ?", [CONFIG_PATH]);
    return row ? Buffer.from(row.data).toString("utf8") : null;
  }

  write(text: string, updatedAt: number): void {
    this.db.run(
      "INSERT INTO files (path, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      [CONFIG_PATH, Buffer.from(text, "utf8"), updatedAt],
    );
  }
}
