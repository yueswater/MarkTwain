/** 論文裡的文件種類（規格 4.1 節與 5 節的檔案對應）。 */
export const DocumentKind = {
  Abstract: "abstract",
  Acknowledgement: "acknowledgement",
  Denotation: "denotation",
  Chapter: "chapter",
  Appendix: "appendix",
} as const;

export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

/** 輸出時的順序：前置（摘要、誌謝、符號說明）、各章、附錄。 */
export const DOCUMENT_KIND_ORDER: readonly DocumentKind[] = [
  DocumentKind.Abstract,
  DocumentKind.Acknowledgement,
  DocumentKind.Denotation,
  DocumentKind.Chapter,
  DocumentKind.Appendix,
];
