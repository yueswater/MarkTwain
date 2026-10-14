/** Kinds of documents in a thesis, see the file mapping in sections 4.1 and 5 of the spec. */
export const DocumentKind = {
  Abstract: "abstract",
  Acknowledgement: "acknowledgement",
  Denotation: "denotation",
  Chapter: "chapter",
  Appendix: "appendix",
} as const;

export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

/** Kinds that a project may have at most once. */
export const SINGLETON_KINDS: readonly DocumentKind[] = [
  DocumentKind.Abstract,
  DocumentKind.Acknowledgement,
  DocumentKind.Denotation,
];

/** Output order, front matter such as abstract, acknowledgements and notation, then chapters, then appendices. */
export const DOCUMENT_KIND_ORDER: readonly DocumentKind[] = [
  DocumentKind.Abstract,
  DocumentKind.Acknowledgement,
  DocumentKind.Denotation,
  DocumentKind.Chapter,
  DocumentKind.Appendix,
];
