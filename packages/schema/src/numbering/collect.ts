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
  /** Targets in document order, unlabeled figures, tables and formulas are included so numbering is right */
  targets: Target[];
  /** Labels that cross-references in the document point to, in order of appearance and possibly repeated */
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
 * A target without a label still takes a number, so it gets a synthetic label.
 * A synthetic label contains ~, which does not fit the label format, so it cannot clash with a user label and is never referenced.
 */
function syntheticLabel(kind: CountedTarget["kind"], scope: string, index: number): string {
  return `${kind}:~${scope}~${index}`;
}

/**
 * Scans one document and collects the targets that can be referenced and the references in it, see section 4.4 of the spec.
 * scope tells synthetic labels of different documents apart, usually the document id.
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
      case "figureGroup": // Sub figures get no number of their own
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
