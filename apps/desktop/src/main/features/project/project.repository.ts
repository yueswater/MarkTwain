import type { OutputEngine } from "../../../shared/ipc";
import type { Database } from "../../infra/db";

/** Read and write of the project table, which has a single row. */
export class ProjectRepository {
  constructor(private readonly db: Database) {}

  insert(name: string, engine: OutputEngine, createdAt: number): void {
    this.db.run("INSERT INTO project (id, name, engine, created_at) VALUES (1, ?, ?, ?)", [name, engine, createdAt]);
  }

  get(): { name: string; engine: OutputEngine } | undefined {
    return this.db.get<{ name: string; engine: OutputEngine }>("SELECT name, engine FROM project WHERE id = 1");
  }
}
