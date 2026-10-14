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
  VAlign,
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
  /** Every label defined in the project, references to labels not in it fall back to plain text and are reported */
  knownLabels: ReadonlySet<string>;
};

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const strOrNull = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/** Converts TipTap or ProseMirror JSON to IR, a pure function with no DOM. */
export function toIr(doc: DocJson, options: IrOptions): IrResult {
  const issues: IrIssue[] = [];
  let current = 0; // Top level block being processed

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

  /** Footnotes and captions store inline Markdown source, so it is parsed again here. */
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
    const attrs = node.attrs ?? {};
    return {
      content: inlines(first?.content),
      align: (strOrNull(attrs.align) as Align) ?? null,
      valign: (strOrNull(attrs.valign) as VAlign) ?? null,
      colspan: Math.max(1, Number(attrs.colspan) || 1),
      rowspan: Math.max(1, Number(attrs.rowspan) || 1),
    };
  }

  /** Width of the grid, counting cells that rows above cover with a rowspan. */
  function gridColumns(rows: Cell[][]): number {
    const covered = new Set<string>();
    let columns = 1;
    rows.forEach((cells, r) => {
      let c = 0;
      for (const item of cells) {
        while (covered.has(`${r}.${c}`)) c += 1;
        for (let dr = 0; dr < item.rowspan; dr += 1) {
          for (let dc = 0; dc < item.colspan; dc += 1) {
            covered.add(`${r + dr}.${c + dc}`);
            columns = Math.max(columns, c + dc + 1);
          }
        }
        c += item.colspan;
      }
    });
    return columns;
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
        const all = rows.map((row) => (row.content ?? []).map(cell));
        const header = hasHeader ? (all[0] ?? []) : null;
        const body = hasHeader ? all.slice(1) : all;
        const widths = String(attrs.widths ?? "")
          .split(",")
          .map((w) => (/^\d+(\.\d+)?(%|pt|cm|mm|in|em)$/.test(w.trim()) ? w.trim() : null));
        return {
          type: "table",
          label: strOrNull(attrs.label),
          caption: inlineSource(attrs.caption),
          notes: inlineSource(attrs.notes),
          header,
          rows: body,
          style: attrs.style === "grid" ? "grid" : "three-line",
          columns: gridColumns(all),
          widths: String(attrs.widths ?? "") === "" ? [] : widths,
          heights: rows.map((row) => strOrNull(row.attrs?.height)),
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
    // A block that cannot be converted still takes an index so output maps back to the source block
    top.push(converted ?? { type: "paragraph", content: [] });
  }
  return { document: { documentId: options.documentId, blocks: top }, issues };
}
