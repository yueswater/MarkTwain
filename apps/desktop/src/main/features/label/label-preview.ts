import { statementOfClasses } from "@marktwain/schema";
import { blockText } from "../search/search.service";
import type { LabelPreviewContent } from "../../../shared/ipc";

type JsonNode = { type?: string; text?: string; attrs?: Record<string, unknown>; content?: JsonNode[] };

const MAX_ROWS = 6;
const MAX_CODE_LINES = 8;
const EXCERPT = 180;

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** Inline Markdown source of a caption as plain text, marks and dollar signs taken away. */
export function plainCaption(source: string): string {
  return source.replace(/\$([^$]+)\$/g, "$1").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
}

function previewOf(node: JsonNode, next: JsonNode | undefined): LabelPreviewContent | null {
  switch (node.type) {
    case "heading":
      return { type: "heading", title: blockText(node).trim(), excerpt: next && next.type === "paragraph" ? blockText(next).trim().slice(0, EXCERPT) : "" };
    case "figure":
      return { type: "figure", src: str(node.attrs?.src), caption: plainCaption(str(node.attrs?.caption)) };
    case "figureGroup": {
      const first = (node.content ?? []).find((child) => child.type === "figure");
      return { type: "figure", src: str(first?.attrs?.src), caption: plainCaption(str(node.attrs?.caption)) };
    }
    case "table": {
      const rows = (node.content ?? []).map((row) => (row.content ?? []).map((cell) => blockText(cell).trim()));
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
      return { type: "statement", kind: kind.id, title: str(props.title), excerpt: first ? blockText(first).trim().slice(0, EXCERPT) : "" };
    }
    default:
      return null;
  }
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
