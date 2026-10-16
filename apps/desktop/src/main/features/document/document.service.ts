import { DOCUMENT_KIND_ORDER, DocumentKind, SINGLETON_KINDS } from "../../../shared/enums/document-kind.enum";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { DocumentData, DocumentSummary } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { DocumentRepository, type DocumentRow } from "./document.repository";

/** Document text is always stored with LF. */
function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function kindRank(kind: string): number {
  const index = DOCUMENT_KIND_ORDER.indexOf(kind as DocumentKind);
  return index === -1 ? DOCUMENT_KIND_ORDER.length : index;
}

function toSummary(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    kind: row.kind as DocumentKind,
    position: row.position,
    title: row.title,
  };
}

export class DocumentService {
  constructor(
    private readonly session: DatabaseSession,
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  private repository(): DocumentRepository {
    return new DocumentRepository(this.session.db);
  }

  /** Default documents of a new project, the abstract and the first chapter. */
  seedDefaults(): void {
    const repository = this.repository();
    const updatedAt = this.now().getTime();
    for (const kind of [DocumentKind.Abstract, DocumentKind.Chapter]) {
      repository.insert({
        id: this.newId(),
        kind,
        position: 1,
        title: "",
        text: "",
        updated_at: updatedAt,
      });
    }
  }

  list(): DocumentSummary[] {
    return this.repository()
      .list()
      .sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.position - b.position)
      .map(toSummary);
  }

  get(id: string): DocumentData {
    const row = this.repository().get(id);
    if (!row) throw new AppError(ErrorCode.DocumentNotFound);
    return { ...toSummary(row), text: row.text };
  }

  save(id: string, text: string): void {
    const updated = this.repository().updateText(
      id,
      normalizeNewlines(text),
      this.now().getTime(),
    );
    if (!updated) throw new AppError(ErrorCode.DocumentNotFound);
  }

  /** Every document with its text, for the versions to keep. */
  readAll(): { id: string; kind: string; title: string; position: number; text: string; updatedAt: number }[] {
    return this.repository()
      .list()
      .map((row) => ({ id: row.id, kind: row.kind, title: row.title, position: row.position, text: row.text, updatedAt: row.updated_at }));
  }

  /**
   * Makes the documents exactly these: those that are not in the list go, the others take the kind, the title, the position and the text.
   * It does not open a transaction, the caller does, so that a restore or a merge is one step.
   */
  replaceAll(documents: { id: string; kind: string; title: string; position: number; text: string }[]): void {
    const repository = this.repository();
    const keep = new Set(documents.map((doc) => doc.id));
    for (const row of repository.list()) if (!keep.has(row.id)) repository.delete(row.id);
    const updatedAt = this.now().getTime();
    for (const doc of documents) repository.upsert({ id: doc.id, kind: doc.kind, position: doc.position, title: doc.title, text: normalizeNewlines(doc.text), updated_at: updatedAt });
  }

  create(kind: DocumentKind): DocumentSummary {
    const repository = this.repository();
    const existing = repository.listByKind(kind);
    if (SINGLETON_KINDS.includes(kind) && existing.length > 0) {
      throw new AppError(ErrorCode.DocumentSingleton);
    }
    const row: DocumentRow = {
      id: this.newId(),
      kind,
      position: existing.length + 1,
      title: "",
      text: "",
      updated_at: this.now().getTime(),
    };
    repository.insert(row);
    return toSummary(row);
  }

  /** After a delete the remaining documents of that kind are renumbered 1 to n. */
  remove(id: string): void {
    this.session.db.transaction(() => {
      const repository = this.repository();
      const row = repository.get(id);
      if (!row || !repository.delete(id)) throw new AppError(ErrorCode.DocumentNotFound);
      repository.listByKind(row.kind).forEach((doc, index) => {
        if (doc.position !== index + 1) repository.updatePosition(doc.id, index + 1);
      });
    });
  }

  /** Puts a document before or after another one of the same kind and renumbers the kind. */
  reorder(id: string, targetId: string, placement: "before" | "after"): void {
    this.session.db.transaction(() => {
      const repository = this.repository();
      const row = repository.get(id);
      const target = repository.get(targetId);
      if (!row || !target) throw new AppError(ErrorCode.DocumentNotFound);
      if (row.kind !== target.kind || row.id === target.id) return;
      const order = repository.listByKind(row.kind).filter((doc) => doc.id !== id);
      const at = order.findIndex((doc) => doc.id === targetId) + (placement === "after" ? 1 : 0);
      order.splice(at, 0, row);
      order.forEach((doc, index) => {
        if (doc.position !== index + 1) repository.updatePosition(doc.id, index + 1);
      });
    });
  }

  move(id: string, delta: -1 | 1): void {
    this.session.db.transaction(() => {
      const repository = this.repository();
      const row = repository.get(id);
      if (!row) throw new AppError(ErrorCode.DocumentNotFound);
      const siblings = repository.listByKind(row.kind);
      const index = siblings.findIndex((doc) => doc.id === id);
      const other = siblings[index + delta];
      if (!other) return;
      repository.updatePosition(row.id, other.position);
      repository.updatePosition(other.id, row.position);
    });
  }

  rename(id: string, title: string): void {
    if (!this.repository().updateTitle(id, title.trim())) {
      throw new AppError(ErrorCode.DocumentNotFound);
    }
  }
}
