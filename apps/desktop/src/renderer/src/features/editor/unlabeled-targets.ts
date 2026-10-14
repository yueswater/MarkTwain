import type { Node as PmNode } from "@tiptap/pm/model";
import { createLabel, isValidLabel, type LabelKind } from "@marktwain/schema";

export type UnlabeledTarget = {
  pos: number;
  kind: LabelKind;
  /** 給人看的簡短說明（標題文字、圖說、公式原文…） */
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
    default:
      return null;
  }
}

function describe(node: PmNode): string {
  const text =
    node.type.name === "blockMath"
      ? String(node.attrs.latex)
      : (node.attrs.caption as string | undefined) || node.textContent;
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
}

/** 文件裡可以被引用、但還沒有標籤的目標（引用它時才自動加上標籤）。 */
export function findUnlabeledTargets(doc: PmNode): UnlabeledTarget[] {
  const found: UnlabeledTarget[] = [];
  doc.descendants((node, pos) => {
    const kind = kindOf(node);
    if (kind && !isValidLabel(String(node.attrs.label ?? ""))) {
      found.push({ pos, kind, text: describe(node) });
    }
    return node.type.name !== "figureGroup"; // 子圖不能單獨引用
  });
  return found;
}

/** 文件裡所有已存在的標籤（含尚未儲存的），用來避免新標籤重複。 */
export function existingLabels(doc: PmNode, others: readonly string[]): Set<string> {
  const labels = new Set<string>(others);
  doc.descendants((node) => {
    const label = node.attrs.label;
    if (typeof label === "string" && label) labels.add(label);
  });
  return labels;
}

export function newLabel(kind: LabelKind, doc: PmNode, others: readonly string[]): string {
  return createLabel(kind, existingLabels(doc, others));
}
