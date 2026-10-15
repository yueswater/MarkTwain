import { isValidLabel, statementOfClasses, type LabelKind } from "@marktwain/schema";
import { blockText } from "../../helpers/block-text.helper";

type JsonNode = { type?: string; text?: string; attrs?: Record<string, unknown>; content?: JsonNode[] };

export type UnlabeledBlock = {
  /** Index of the top level block */
  block: number;
  kind: LabelKind;
  /** Short description for people, such as heading text, caption or formula source */
  text: string;
};

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** The prefix of the label that a block would take, null when it cannot be referenced. A figure or table without a caption takes no number. */
function kindOf(node: JsonNode): LabelKind | null {
  switch (node.type) {
    case "heading":
      return node.attrs?.level === 1 ? "cha" : "sec";
    case "figure":
    case "figureGroup":
      return str(node.attrs?.caption).trim() ? "fig" : null;
    case "table":
      return str(node.attrs?.caption).trim() ? "tbl" : null;
    case "blockMath":
      return "eq";
    case "codeBlock":
      return str(node.attrs?.caption).trim() ? "lst" : null;
    case "div": {
      const classes = Array.isArray(node.attrs?.classes) ? (node.attrs.classes as unknown[]).filter((c): c is string => typeof c === "string") : [];
      const statement = statementOfClasses(classes);
      return statement?.numbered ? (statement.prefix as LabelKind) : null;
    }
    default:
      return null;
  }
}

/** A block of a mathematical thesis keeps its label in id, the others in label. */
const slotOf = (node: JsonNode): "id" | "label" => (node.type === "div" ? "id" : "label");

function describe(node: JsonNode): string {
  const text = node.type === "blockMath" ? str(node.attrs?.latex) : str(node.attrs?.caption) || str((node.attrs?.props as { title?: unknown } | undefined)?.title) || blockText(node);
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
}

/** The top level blocks that can be referenced but have no label yet. */
export function findUnlabeledBlocks(blocks: readonly JsonNode[]): UnlabeledBlock[] {
  const out: UnlabeledBlock[] = [];
  blocks.forEach((node, block) => {
    const kind = kindOf(node);
    if (kind && !isValidLabel(str(node.attrs?.[slotOf(node)]))) out.push({ block, kind, text: describe(node) });
  });
  return out;
}

/** The kind a block would take when it has no label, null when it is gone or cannot be referenced. */
export function kindAt(blocks: readonly JsonNode[], block: number): LabelKind | null {
  const node = blocks[block];
  return node ? kindOf(node) : null;
}

/** The label of a block, empty when it has none. */
export function labelAt(blocks: readonly JsonNode[], block: number): string {
  const node = blocks[block];
  return node ? str(node.attrs?.[slotOf(node)]) : "";
}

/** The blocks with the label written into the block at the index. */
export function withLabel<T extends JsonNode>(blocks: readonly T[], block: number, label: string): T[] {
  return blocks.map((node, index) => (index === block ? { ...node, attrs: { ...node.attrs, [slotOf(node)]: label } } : node));
}

/** Every label and id that the blocks hold at any depth, to keep a new label unique. */
export function labelsIn(blocks: readonly JsonNode[]): string[] {
  const out: string[] = [];
  const walk = (node: JsonNode): void => {
    for (const value of [node.attrs?.label, node.attrs?.id]) if (typeof value === "string" && value) out.push(value);
    node.content?.forEach(walk);
  };
  blocks.forEach(walk);
  return out;
}
