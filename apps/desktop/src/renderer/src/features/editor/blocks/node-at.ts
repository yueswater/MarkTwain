import type { Node as PmNode } from "@tiptap/pm/model";

/**
 * The node at a position, null when there is none. A position that was kept can be beyond the end of the document once the document was replaced,
 * and nodeAt throws for it, which would stop the transaction that was being applied.
 */
export function nodeAtSafe(doc: PmNode, pos: number): PmNode | null {
  if (!Number.isInteger(pos) || pos < 0 || pos > doc.content.size) return null;
  return doc.nodeAt(pos);
}
