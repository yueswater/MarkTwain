import { statementOfClasses } from "@marktwain/schema";
import { blockText } from "../../helpers/block-text.helper";
import type { LabelPreviewContent } from "../../../shared/ipc";

type JsonNode = { type?: string; text?: string; attrs?: Record<string, unknown>; content?: JsonNode[] };

const MAX_ROWS = 6;
const MAX_CODE_LINES = 8;
const EXCERPT = 180;

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** Inline Markdown source of a caption as plain text, marks taken away and formulas kept between dollar signs so the card can draw them. */
export function plainCaption(source: string): string {
  return source.replace(/(\$[^$]+\$)|[*_`]/g, (_, math: string | undefined) => math ?? "").replace(/\s+/g, " ").trim();
}

/** The text of a block with every inline formula between dollar signs, for the card to draw. */
export function richText(node: JsonNode): string {
  if (node.text !== undefined) return node.text;
  if (node.type === "inlineMath") return `$${str(node.attrs?.latex)}$`;
  if (node.type === "footnote") return "";
  const children = (node.content ?? []).map(richText);
  return children.filter((part) => part !== "").join(node.type === "tableRow" ? "  " : node.type === "paragraph" ? "" : " ");
}

function previewOf(node: JsonNode, next: JsonNode | undefined): LabelPreviewContent | null {
  switch (node.type) {
    case "heading":
      return { type: "heading", title: richText(node).trim(), excerpt: next && next.type === "paragraph" ? richText(next).trim().slice(0, EXCERPT) : "" };
    case "figure":
      return { type: "figure", src: str(node.attrs?.src), caption: plainCaption(str(node.attrs?.caption)) };
    case "figureGroup": {
      const first = (node.content ?? []).find((child) => child.type === "figure");
      return { type: "figure", src: str(first?.attrs?.src), caption: plainCaption(str(node.attrs?.caption)) };
    }
    case "table": {
      const rows = (node.content ?? []).map((row) => (row.content ?? []).map((cell) => richText(cell).trim()));
      return { type: "table", caption: plainCaption(str(node.attrs?.caption)), rows: rows.slice(0, MAX_ROWS), more: rows.length > MAX_ROWS };
    }
    case "blockMath":
      return { type: "formula", latex: str(node.attrs?.latex) };
    case "codeBlock": {
      const lines = blockText(node).split("\n");
      return { type: "code", text: lines.slice(0, MAX_CODE_LINES).join("\n"), more: lines.length > MAX_CODE_LINES, language: str(node.attrs?.language), caption: plainCaption(str(node.attrs?.caption)) };
    }
    case "div": {
      const classes = Array.isArray(node.attrs?.classes) ? (node.attrs.classes as unknown[]).filter((c): c is string => typeof c === "string") : [];
      const kind = statementOfClasses(classes);
      if (!kind) return null;
      const first = (node.content ?? []).find((child) => child.type === "paragraph");
      const props = (node.attrs?.props ?? {}) as Record<string, unknown>;
      return { type: "statement", kind: kind.id, title: str(props.title), excerpt: first ? richText(first).trim().slice(0, EXCERPT) : "" };
    }
    default:
      return null;
  }
}

function refersTo(node: JsonNode, label: string): boolean {
  if (node.type === "crossRef" && node.attrs?.label === label) return true;
  return (node.content ?? []).some((child) => refersTo(child, label));
}

/** The top level blocks of a document that refer to a label, with the start of their text. */
export function findReferences(blocks: readonly JsonNode[], label: string): { block: number; excerpt: string }[] {
  const found: { block: number; excerpt: string }[] = [];
  blocks.forEach((node, block) => {
    if (refersTo(node, label)) found.push({ block, excerpt: richText(node).trim().slice(0, 80) });
  });
  return found;
}

/** The part of a document that a label points to, shown in the card that opens over a reference. */
export function findPreview(blocks: readonly JsonNode[], label: string): { content: LabelPreviewContent; block: number } | null {
  for (let index = 0; index < blocks.length; index += 1) {
    const node = blocks[index]!;
    if (node.attrs?.label !== label && node.attrs?.id !== label) continue;
    const content = previewOf(node, blocks[index + 1]);
    return content ? { content, block: index } : null;
  }
  return null;
}
