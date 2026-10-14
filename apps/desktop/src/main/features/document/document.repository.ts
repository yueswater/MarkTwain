import type { Database } from "../../infra/db";

export type DocumentRow = {
  id: string;
  kind: string;
  position: number;
  title: string;
  text: string;
  updated_at: number;
};

/** documents 資料表的讀寫；整個功能裡唯一寫 SQL 的地方。 */
export class DocumentRepository {
  constructor(private readonly db: Database) {}

  insert(row: DocumentRow): void {
    this.db.run(
      "INSERT INTO documents (id, kind, position, title, text, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [row.id, row.kind, row.position, row.title, row.text, row.updated_at],
    );
  }

  list(): DocumentRow[] {
    return this.db.all<DocumentRow>("SELECT id, kind, position, title, text, updated_at FROM documents");
  }

  get(id: string): DocumentRow | undefined {
    return this.db.get<DocumentRow>(
      "SELECT id, kind, position, title, text, updated_at FROM documents WHERE id = ?",
      [id],
    );
  }

  listByKind(kind: string): DocumentRow[] {
    return this.db.all<DocumentRow>(
      "SELECT id, kind, position, title, text, updated_at FROM documents WHERE kind = ? ORDER BY position",
      [kind],
    );
  }

  /** 回傳是否有刪到列。 */
  delete(id: string): boolean {
    return this.db.run("DELETE FROM documents WHERE id = ?", [id]).changes > 0;
  }

  updatePosition(id: string, position: number): void {
    this.db.run("UPDATE documents SET position = ? WHERE id = ?", [position, id]);
  }

  updateTitle(id: string, title: string): boolean {
    return this.db.run("UPDATE documents SET title = ? WHERE id = ?", [title, id]).changes > 0;
  }

  /** 回傳是否有更新到列。 */
  updateText(id: string, text: string, updatedAt: number): boolean {
    return (
      this.db.run("UPDATE documents SET text = ?, updated_at = ? WHERE id = ?", [text, updatedAt, id])
        .changes > 0
    );
  }
}
