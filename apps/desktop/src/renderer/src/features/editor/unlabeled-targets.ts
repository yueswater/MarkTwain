import type { Node as PmNode } from "@tiptap/pm/model";
import { createLabel, isValidLabel, type LabelKind } from "@marktwain/schema";
import { statementOf } from "./statement-heads";

export type UnlabeledTarget = {
  pos: number;
  kind: LabelKind;
  /** Short description for people, such as heading text, caption or formula source */
  text: string;
};

function kindOf(node: PmNode): LabelKind | null {
  switch (node.type.name) {
    case "heading":
      return node.attrs.level === 1 ? "cha" : "sec";
    case "figure":
    case "figureGroup":
      return "fig";
    case "table":
      return "tbl";
    case "blockMath":
      return "eq";
    case "codeBlock":
      return node.attrs.caption ? "lst" : null;
    // A block of a mathematical thesis keeps its label in id, a proof is not referenced
    case "div": {
      const statement = statementOf(node);
      return statement?.numbered ? statement.prefix : null;
    }
    default:
      return null;
  }
}

function describe(node: PmNode): string {
  const text =
    node.type.name === "blockMath"
      ? String(node.attrs.latex)
      : (node.attrs.caption as string | undefined) || (node.attrs.props as { title?: string } | undefined)?.title || node.textContent;
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Targets in the document that can be referenced but have no label yet, a label is added when one is referenced. */
export function findUnlabeledTargets(doc: PmNode): UnlabeledTarget[] {
  const found: UnlabeledTarget[] = [];
  doc.descendants((node, pos) => {
    const kind = kindOf(node);
    if (kind && !isValidLabel(String(node.attrs.label ?? node.attrs.id ?? ""))) {
      found.push({ pos, kind, text: describe(node) });
    }
    return node.type.name !== "figureGroup"; // Sub figures cannot be referenced on their own
  });
  return found;
}

/** All labels that exist in the document, including unsaved ones, to keep new labels unique. */
export function existingLabels(doc: PmNode, others: readonly string[]): Set<string> {
  const labels = new Set<string>(others);
  doc.descendants((node) => {
    for (const label of [node.attrs.label, node.attrs.id]) {
      if (typeof label === "string" && label) labels.add(label);
    }
  });
  return labels;
}

export function newLabel(kind: LabelKind, doc: PmNode, others: readonly string[]): string {
  return createLabel(kind, existingLabels(doc, others));
}
