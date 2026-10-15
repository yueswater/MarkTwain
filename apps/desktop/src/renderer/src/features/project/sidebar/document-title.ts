import type { TFunction } from "i18next";
import type { DocumentSummary } from "../../../../../shared/ipc/index";

/** Title for display, a custom one wins, otherwise it comes from kind and position such as Chapter 2. */
export function documentTitle(t: TFunction, doc: Pick<DocumentSummary, "kind" | "position" | "title">): string {
  return doc.title || t(`kind.title.${doc.kind}`, { ns: "project", n: doc.position });
}

/** Default name of a project, the file name without extension. */
export function projectNameFromPath(path: string): string {
  const file = path.split(/[\\/]/).pop() ?? path;
  const dot = file.lastIndexOf(".");
  return dot > 0 ? file.slice(0, dot) : file;
}
