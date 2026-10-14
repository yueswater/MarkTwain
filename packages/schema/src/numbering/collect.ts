import type { DocJson } from "../markdown/parse";
import { labelKind } from "../labels/labels";
import type { CountedTarget, Target } from "./types";

type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
};

export type CollectedTargets = {
  /** 文件順序的目標；沒有標籤的圖、表、公式也在內，這樣編號才會對 */
  targets: Target[];
  /** 文件裡的交叉引用所指的標籤，依出現順序（可重複） */
  references: string[];
};

function plainText(node: JsonNode): string {
  if (node.text !== undefined) return node.text;
  return (node.content ?? []).map(plainText).join("");
}

function labelOf(node: JsonNode): string | null {
  const label = node.attrs?.label;
  return typeof label === "string" && label !== "" ? label : null;
}

/**
 * 沒有標籤的目標也要佔一個編號，所以給它一個合成的標籤。
 * 合成標籤含 `~`，不符合標籤的格式，不可能與使用者的標籤衝突，也不會被引用。
 */
function syntheticLabel(kind: CountedTarget["kind"], scope: string, index: number): string {
  return `${kind}:~${scope}~${index}`;
}

/**
 * 掃過一份文件，收集可被引用的目標與文件裡的引用（規格 4.4 節）。
 * `scope` 用來區分不同文件的合成標籤（通常是文件 id）。
 */
export function collectTargets(doc: DocJson, scope: string): CollectedTargets {
  const targets: Target[] = [];
  const references: string[] = [];
  let synthetic = 0;

  const counted = (kind: CountedTarget["kind"], node: JsonNode) => {
    synthetic += 1;
    targets.push({ kind, label: labelOf(node) ?? syntheticLabel(kind, scope, synthetic) });
  };

  const walk = (node: JsonNode): void => {
    switch (node.type) {
      case "heading": {
        const label = labelOf(node);
        const kind = label ? labelKind(label) : null;
        if (label && (kind === "cha" || kind === "sec")) {
          targets.push({ kind, label, text: plainText(node).trim() });
        }
        return;
      }
      case "figure":
        counted("fig", node);
        return;
      case "figureGroup": // 子圖不另外編號
        counted("fig", node);
        return;
      case "table":
        counted("tbl", node);
        return;
      case "blockMath":
        counted("eq", node);
        return;
      case "codeBlock":
        if (labelOf(node) || node.attrs?.caption) counted("lst", node);
        return;
      case "crossRef": {
        const label = labelOf(node);
        if (label) references.push(label);
        return;
      }
    }
    for (const child of node.content ?? []) walk(child);
  };

  walk(doc as JsonNode);
  return { targets, references };
}
