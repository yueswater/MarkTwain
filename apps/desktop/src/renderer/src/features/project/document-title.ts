import type { TFunction } from "i18next";
import type { DocumentSummary } from "../../../../shared/ipc";

/** 顯示用的標題：使用者自訂的優先，否則依種類與順序產生（例如「第 2 章」）。 */
export function documentTitle(t: TFunction, doc: Pick<DocumentSummary, "kind" | "position" | "title">): string {
  return doc.title || t(`kind.title.${doc.kind}`, { ns: "project", n: doc.position });
}

/** 專案檔的預設名稱：檔名去掉副檔名。 */
export function projectNameFromPath(path: string): string {
  const file = path.split(/[\\/]/).pop() ?? path;
  const dot = file.lastIndexOf(".");
  return dot > 0 ? file.slice(0, dot) : file;
}
