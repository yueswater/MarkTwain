import { labelKind, parseInlineMarkdown, type DocJson } from "@marktwain/schema";
import type {
  Align,
  Block,
  Cell,
  CitationForm,
  Inline,
  IrIssue,
  IrResult,
  RefKind,
  TextMark,
} from "./types";

type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export type IrOptions = {
  documentId: string;
  /** 專案裡所有已定義的標籤；引用不在其中的標籤會退回純文字並列入問題清單 */
  knownLabels: ReadonlySet<string>;
};

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const strOrNull = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/** 把 TipTap（ProseMirror）JSON 轉成 IR；純函式，不依賴 DOM。 */
export function toIr(doc: DocJson, options: IrOptions): IrResult {
  const issues: IrIssue[] = [];
  let current = 0; // 目前處理的頂層區塊

  const report = (code: IrIssue["code"], detail: string) =>
    issues.push({ code, documentId: options.documentId, block: current, detail });

  function inlines(nodes: JsonNode[] | undefined): Inline[] {
    const out: Inline[] = [];
    for (const node of nodes ?? []) {
      const next = inline(node);
      if (next) out.push(next);
    }
    return out;
  }

  /** 腳註、圖說等欄位存的是行內 Markdown 原文，這裡再解析一次。 */
  function inlineSource(source: unknown): Inline[] {
    const text = str(source);
    return text === "" ? [] : inlines(parseInlineMarkdown(text) as JsonNode[]);
  }

  function inline(node: JsonNode): Inline | null {
    switch (node.type) {
      case "text": {
        const marks = node.marks ?? [];
        if (marks.some((m) => m.type === "code")) return { type: "code", text: str(node.text) };
        const link = marks.find((m) => m.type === "link");
        return {
          type: "text",
          text: str(node.text),
          marks: marks.map((m) => m.type).filter((t): t is TextMark => t === "bold" || t === "italic" || t === "strike"),
          link: link ? str(link.attrs?.href) : null,
        };
      }
      case "hardBreak":
        return { type: "break" };
      case "inlineMath":
        return { type: "math", latex: str(node.attrs?.latex) };
      case "footnote":
        return { type: "footnote", content: inlineSource(node.attrs?.text) };
      case "citation":
        return {
          type: "citation",
          keys: Array.isArray(node.attrs?.keys) ? (node.attrs.keys as unknown[]).map(str) : [],
          form: (str(node.attrs?.form) || "paren") as CitationForm,
        };
      case "crossRef": {
        const label = str(node.attrs?.label);
        const kind = labelKind(label);
        if (!kind || !options.knownLabels.has(label)) {
          report("broken-ref", label);
          return { type: "text", text: label, marks: [], link: null };
        }
        return { type: "ref", label, kind: kind as RefKind };
      }
      default:
        report("unknown-node", String(node.type));
        return null;
    }
  }

  function codeText(node: JsonNode): string {
    return (node.content ?? []).map((child) => str(child.text)).join("");
  }

  function blocks(nodes: JsonNode[] | undefined): Block[] {
    const out: Block[] = [];
    for (const node of nodes ?? []) {
      const next = block(node);
      if (next) out.push(next);
    }
    return out;
  }

  function cell(node: JsonNode): Cell {
    const first = node.content?.[0];
    return { content: inlines(first?.content), align: (strOrNull(node.attrs?.align) as Align) ?? null };
  }

  function block(node: JsonNode): Block | null {
    const attrs = node.attrs ?? {};
    switch (node.type) {
      case "heading":
        return {
          type: "heading",
          level: Number(attrs.level) || 1,
          label: strOrNull(attrs.label),
          content: inlines(node.content),
        };
      case "paragraph":
        return { type: "paragraph", content: inlines(node.content) };
      case "bulletList":
      case "orderedList":
        return {
          type: "list",
          ordered: node.type === "orderedList",
          start: Number(attrs.start) || 1,
          items: (node.content ?? []).map((item) => blocks(item.content)),
        };
      case "blockquote":
        return { type: "quote", children: blocks(node.content) };
      case "codeBlock":
        return {
          type: "code",
          language: strOrNull(attrs.language),
          label: strOrNull(attrs.label),
          caption: inlineSource(attrs.caption),
          text: codeText(node),
        };
      case "blockMath":
        return { type: "math", latex: str(attrs.latex), label: strOrNull(attrs.label) };
      case "horizontalRule":
        return { type: "rule" };
      case "figure":
        return {
          type: "figure",
          src: str(attrs.src),
          caption: inlineSource(attrs.caption),
          label: strOrNull(attrs.label),
          width: strOrNull(attrs.width),
        };
      case "figureGroup":
        return {
          type: "figureGroup",
          layout: attrs.layout === "grid" ? "grid" : "row",
          columns: typeof attrs.columns === "number" ? attrs.columns : null,
          label: strOrNull(attrs.label),
          caption: inlineSource(attrs.caption),
          items: (node.content ?? []).map((item) => ({
            src: str(item.attrs?.src),
            caption: inlineSource(item.attrs?.caption),
          })),
        };
      case "table": {
        const rows = node.content ?? [];
        const isHeader = (row: JsonNode) => (row.content ?? []).every((c) => c.type === "tableHeader");
        const hasHeader = rows.length > 0 && isHeader(rows[0] as JsonNode);
        const body = (hasHeader ? rows.slice(1) : rows).map((row) => (row.content ?? []).map(cell));
        return {
          type: "table",
          label: strOrNull(attrs.label),
          caption: inlineSource(attrs.caption),
          notes: inlineSource(attrs.notes),
          header: hasHeader ? (rows[0]?.content ?? []).map(cell) : null,
          rows: body,
        };
      }
      case "definitionList": {
        const entries: { term: Inline[]; descriptions: Block[][] }[] = [];
        for (const child of node.content ?? []) {
          if (child.type === "definitionTerm") entries.push({ term: inlines(child.content), descriptions: [] });
          else if (child.type === "definitionDescription") entries.at(-1)?.descriptions.push(blocks(child.content));
        }
        return { type: "definitionList", entries };
      }
      case "div":
        return {
          type: "div",
          id: strOrNull(attrs.id),
          classes: Array.isArray(attrs.classes) ? (attrs.classes as unknown[]).map(str) : [],
          props: Object.fromEntries(
            Object.entries((attrs.props as Record<string, unknown> | undefined) ?? {}).map(([k, v]) => [k, str(v)]),
          ),
          children: blocks(node.content),
        };
      default:
        report("unknown-node", String(node.type));
        return null;
    }
  }

  const top: Block[] = [];
  for (const [index, node] of ((doc as JsonNode).content ?? []).entries()) {
    current = index;
    const converted = block(node);
    // 無法轉換的區塊也要佔一個索引，輸出才能對回來源區塊
    top.push(converted ?? { type: "paragraph", content: [] });
  }
  return { document: { documentId: options.documentId, blocks: top }, issues };
}
