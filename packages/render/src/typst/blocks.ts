import type { Align, Block, Cell, Inline } from "../ir/types";
import { escapeString, fenceFor, safeLength } from "./escape";
import { renderInline, type InlineContext } from "./inline";
import { convertMath, mathFallback } from "./math";

export type BlockContext = InlineContext & {
  /** 專案內的圖片路徑 → 建置目錄裡的絕對路徑（以 / 開頭） */
  imagePath: (src: string) => string;
};

const ALIGN: Record<Exclude<Align, null>, string> = {
  left: "left + horizon",
  center: "center + horizon",
  right: "right + horizon",
};

const label = (value: string | null) => (value ? ` <${value}>` : "");
const str = (value: string) => `"${escapeString(value)}"`;
const content = (nodes: Inline[], ctx: BlockContext) => `[${renderInline(nodes, ctx)}]`;

function indent(lines: string[], by: string): string[] {
  return lines.map((line) => (line === "" ? line : by + line));
}

/** 區塊轉成行；區塊之間由呼叫端以空行隔開。 */
export function renderBlock(block: Block, ctx: BlockContext): string[] {
  switch (block.type) {
    case "heading":
      return [`${"=".repeat(Math.min(Math.max(block.level, 1), 4))} ${renderInline(block.content, ctx)}${label(block.label)}`];

    case "paragraph": {
      const text = renderInline(block.content, ctx);
      return text.trim() === "" ? [] : text.split("\n");
    }

    case "list": {
      const lines: string[] = [];
      block.items.forEach((item, index) => {
        const marker = block.ordered ? `${block.start + index}. ` : "- ";
        const body = renderBlocks(item, ctx, true);
        const pad = " ".repeat(marker.length);
        body.forEach((line, i) => lines.push(i === 0 ? marker + line : line === "" ? line : pad + line));
        if (body.length === 0) lines.push(marker.trimEnd());
      });
      return lines;
    }

    case "quote":
      return ["#quote(block: true)[", ...indent(renderBlocks(block.children, ctx), "  "), "]"];

    case "code": {
      const fence = fenceFor(block.text);
      const raw = `${fence}${block.language ?? ""}\n${block.text}\n${fence}`.split("\n");
      if (block.caption.length === 0 && !block.label) return raw;
      const caption = block.caption.length > 0 ? `caption: ${content(block.caption, ctx)}` : "";
      return [`#code(${caption})[`, ...raw, `]${label(block.label)}`];
    }

    case "math": {
      const result = convertMath(block.latex);
      if (!result.ok) {
        ctx.onMathFailure(block.latex);
        return [mathFallback(block.latex, true)];
      }
      return [`$ ${result.typst} $${label(block.label)}`];
    }

    case "figure": {
      const args = [str(ctx.imagePath(block.src))];
      if (block.caption.length > 0) args.push(`caption: ${content(block.caption, ctx)}`);
      const width = safeLength(block.width);
      if (width) args.push(`width: ${width}`);
      return [`#fig(${args.join(", ")})${label(block.label)}`];
    }

    case "figureGroup": {
      const items = block.items.map((item) =>
        item.caption.length > 0
          ? `(${str(ctx.imagePath(item.src))}, ${content(item.caption, ctx)})`
          : `(${str(ctx.imagePath(item.src))},)`,
      );
      const args: string[] = [];
      if (block.layout === "grid" && block.columns) args.push(`columns: ${block.columns}`);
      if (block.caption.length > 0) args.push(`caption: ${content(block.caption, ctx)}`);
      const fn = block.layout === "grid" ? "fig-grid" : "fig-row";
      return [`#${fn}(`, ...indent([...args.map((a) => `${a},`), ...items.map((i) => `${i},`)], "  "), `)${label(block.label)}`];
    }

    case "table": {
      const columns = Math.max(block.header?.length ?? 0, ...block.rows.map((row) => row.length), 1);
      const first: Cell[] = block.header ?? block.rows[0] ?? [];
      const align = Array.from({ length: columns }, (_, i) => ALIGN[first[i]?.align ?? "center"]);
      const row = (cells: Cell[]) =>
        `(${Array.from({ length: columns }, (_, i) => content(cells[i]?.content ?? [], ctx)).join(", ")},)`;
      const lines = [
        "#tlt(",
        ...(block.caption.length > 0 ? [`  caption: ${content(block.caption, ctx)},`] : []),
        `  columns: ${columns},`,
        `  align: (${align.join(", ")},),`,
        ...(block.header ? [`  header: ${row(block.header)},`] : []),
        "  rows: (",
        ...block.rows.map((r) => `    ${row(r)},`),
        "  ),",
        ...(block.notes.length > 0 ? [`  notes: ${content(block.notes, ctx)},`] : []),
        `)${label(block.label)}`,
      ];
      return lines;
    }

    case "rule":
      return ["#line(length: 100%)"];

    case "definitionList": {
      const lines: string[] = [];
      for (const entry of block.entries) {
        const [first = [], ...rest] = entry.descriptions.map((d) => renderBlocks(d, ctx, true));
        const head = `/ ${renderInline(entry.term, ctx)}: ${first[0] ?? ""}`;
        lines.push(head, ...indent(first.slice(1), "  "));
        for (const extra of rest) lines.push("", ...indent(extra, "  "));
      }
      return lines;
    }

    case "div":
      return renderBlocks(block.children, ctx);
  }
}

/**
 * 多個區塊以空行隔開。在清單項目裡（`inList`），第二個以後的段落不縮排首行（轉換陷阱）。
 */
export function renderBlocks(blocks: Block[], ctx: BlockContext, inList = false): string[] {
  const out: string[] = [];
  blocks.forEach((block, index) => {
    let lines = renderBlock(block, ctx);
    if (lines.length === 0) return;
    if (inList && index > 0 && block.type === "paragraph") {
      lines = ["#par(first-line-indent: 0em)[", ...indent(lines, "  "), "]"];
    }
    // 清單項目裡，段落與緊接的巢狀清單之間不留空行（留了會變成寬鬆清單）
    if (out.length > 0 && !(inList && block.type === "list")) out.push("");
    out.push(...lines);
  });
  return out;
}
