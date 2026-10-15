import type { UnlabeledTarget } from "./unlabeled-targets";

/** Editing state shared by the three inline atom nodes, footnote, citation and cross-reference. */
export type AtomTarget =
  | { type: "footnote"; pos: number | null; text: string }
  | { type: "citation"; pos: number | null; keys: string[]; form: string }
  | { type: "crossRef"; pos: number | null; label: string };

export type CrossRefChoice =
  | { kind: "existing"; label: string }
  | { kind: "new"; pos: number; labelKind: UnlabeledTarget["kind"] }
  /** A block of another document, which gets its label when the choice is made */
  | { kind: "remote"; documentId: string; block: number; labelKind: UnlabeledTarget["kind"] };
