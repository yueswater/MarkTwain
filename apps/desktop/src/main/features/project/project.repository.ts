import type { Database } from "../../infra/db";

/** Read and write of the project table, which has a single row. */
export class ProjectRepository {
  constructor(private readonly db: Database) {}

  insert(name: string, createdAt: number): void {
    this.db.run("INSERT INTO project (id, name, created_at) VALUES (1, ?, ?)", [name, createdAt]);
  }

  get(): { name: string } | undefined {
    return this.db.get<{ name: string }>("SELECT name FROM project WHERE id = 1");
  }
}
