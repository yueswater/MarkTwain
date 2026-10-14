import { DOCUMENT_KIND_ORDER, DocumentKind } from "../../../shared/enums/document-kind.enum";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { DocumentData, DocumentSummary } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { DocumentRepository, type DocumentRow } from "./document.repository";

/** 文件文字一律以 LF 儲存（規格 9.1 節規則 3）。 */
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

  /** 新專案的預設文件：摘要與第一章。 */
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
}
