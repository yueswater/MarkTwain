import type { Node as PmNode } from "@tiptap/pm/model";
import { statementOfClasses, type StatementKind } from "@marktwain/schema";

export type StatementHead = {
  pos: number;
  size: number;
  kind: StatementKind;
  /** Text of the head, the name of the kind, the number and the title, such as 定義 1（範數） */
  text: string;
  title: string;
};

/** The statement kind of a div node, null for any other node. */
export function statementOf(node: PmNode): StatementKind | null {
  if (node.type.name !== "div") return null;
  const classes = node.attrs.classes;
  return Array.isArray(classes) ? statementOfClasses(classes.filter((c): c is string => typeof c === "string")) : null;
}

/**
 * Heads of the blocks of a mathematical thesis in the document, each kind numbered on its own through the thesis.
 * base tells how many blocks of a kind the documents before this one hold.
 */
export function findStatementHeads(
  doc: PmNode,
  base: Readonly<Record<string, number>>,
  nameOf: (kind: StatementKind) => string,
): StatementHead[] {
  const counts: Record<string, number> = {};
  const heads: StatementHead[] = [];
  doc.descendants((node, pos) => {
    const kind = statementOf(node);
    if (!kind) return true;
    let number = "";
    if (kind.numbered) {
      counts[kind.id] = (counts[kind.id] ?? 0) + 1;
      number = ` ${(base[kind.prefix] ?? 0) + counts[kind.id]!}`;
    }
    const title = String((node.attrs.props as Record<string, unknown> | undefined)?.title ?? "").trim();
    heads.push({ pos, size: node.nodeSize, kind, title, text: `${nameOf(kind)}${number}${title ? `（${title}）` : ""}` });
    return true;
  });
  return heads;
}
