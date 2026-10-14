import { statementOfClasses } from "@marktwain/schema";
import type { Align, Block, Cell, Inline } from "../ir/types";
import { escapeString, fenceFor, safeLength } from "./escape";
import { renderInline, type InlineContext } from "./inline";
import { convertMath, mathFallback } from "./math";

export type BlockContext = InlineContext & {
  /** Image path in the project to absolute path in the build directory, starting with / */
  imagePath: (src: string) => string;
};

const ALIGN: Record<Exclude<Align, null>, string> = {
  left: "left + horizon",
  center: "center + horizon",
  right: "right + horizon",
};

const VALIGN = { top: "top", middle: "horizon", bottom: "bottom" } as const;

type TableBlock = Extract<Block, { type: "table" }>;

/** Starting grid column of every cell, skipping positions that rows above cover with a rowspan. */
function columnStarts(rows: Cell[][]): number[][] {
  const covered = new Set<string>();
  return rows.map((cells, r) => {
    let c = 0;
    return cells.map((cell) => {
      while (covered.has(`${r}.${c}`)) c += 1;
      for (let dr = 0; dr < cell.rowspan; dr += 1) {
        for (let dc = 0; dc < cell.colspan; dc += 1) covered.add(`${r + dr}.${c + dc}`);
      }
      const start = c;
      c += cell.colspan;
      return start;
    });
  });
}

/** A table that the template's tlt can draw as is, with no merges, widths, heights or vertical alignment. */
function isPlain(table: TableBlock): boolean {
  const cells = [...(table.header ?? []), ...table.rows.flat()];
  return (
    table.style === "three-line" &&
    table.widths.length === 0 &&
    table.heights.every((h) => h === null) &&
    cells.every((c) => c.colspan === 1 && c.rowspan === 1 && c.valign === null)
  );
}

function renderTable(block: TableBlock, ctx: BlockContext): string[] {
  const columns = block.columns;
  const first: Cell[] = block.header ?? block.rows[0] ?? [];
  const columnAlign = Array.from({ length: columns }, (_, i) => first[i]?.align ?? "center");
  const captioned = block.caption.length > 0;
  const caption = `caption: ${content(block.caption, ctx)}`;
  const notes = block.notes.length > 0 ? content(block.notes, ctx) : null;

  if (isPlain(block) && captioned) {
    const row = (cells: Cell[]) =>
      `(${Array.from({ length: columns }, (_, i) => content(cells[i]?.content ?? [], ctx)).join(", ")},)`;
    return [
      "#tlt(",
      `  ${caption},`,
      `  columns: (${Array.from({ length: columns }, () => "1fr").join(", ")},),`,
      `  align: (${columnAlign.map((a) => ALIGN[a]).join(", ")},),`,
      ...(block.header ? [`  header: ${row(block.header)},`] : []),
      "  rows: (",
      ...block.rows.map((r) => `    ${row(r)},`),
      "  ),",
      ...(notes ? [`  notes: ${notes},`] : []),
      `)${label(block.label)}`,
    ];
  }

  // Cells with their own spans or alignment need table.cell, so draw the figure here like tlt does
  const all = block.header ? [block.header, ...block.rows] : block.rows;
  const starts = columnStarts(all);
  const cell = (c: Cell, column: number): string => {
    const options: string[] = [];
    if (c.colspan > 1) options.push(`colspan: ${c.colspan}`);
    if (c.rowspan > 1) options.push(`rowspan: ${c.rowspan}`);
    // Alignment is only spelled out when it differs from the column
    const own = c.align !== null && c.align !== (columnAlign[column] ?? "center");
    if (own || c.valign !== null) {
      options.push(`align: ${c.align ?? columnAlign[column] ?? "center"} + ${VALIGN[c.valign ?? "middle"]}`);
    }
    const body = content(c.content, ctx);
    return options.length > 0 ? `table.cell(${options.join(", ")})${body}` : body;
  };
  const cellsOf = (row: Cell[], rowIndex: number) =>
    row.map((c, i) => `      ${cell(c, starts[rowIndex]?.[i] ?? i)},`);
  const grid = block.style === "grid";
  const widths = block.widths.length > 0 ? Array.from({ length: columns }, (_, i) => block.widths[i] ?? "auto") : null;
  const rowCount = (block.header ? 1 : 0) + block.rows.length;
  const heights = block.heights.some((h) => h !== null) ? Array.from({ length: rowCount }, (_, i) => block.heights[i] ?? "auto") : null;

  const inner = [
    "    table(",
    `      columns: (${(widths ?? Array.from({ length: columns }, () => "1fr")).join(", ")},),`,
    ...(heights ? [`      rows: (${heights.join(", ")},),`] : []),
    `      align: (${columnAlign.map((a) => ALIGN[a]).join(", ")},),`,
    `      stroke: ${grid ? "0.5pt" : "none"},`,
    "      inset: (x: 0.6em, y: 0.45em),",
    ...(block.header
      ? [
          grid ? "      table.header(repeat: true," : "      table.header(repeat: true, toprule,",
          ...cellsOf(block.header, 0),
          grid ? "      )," : "      midrule),",
        ]
      : grid
        ? []
        : ["      toprule,"]),
    ...block.rows.flatMap((r, i) => cellsOf(r, i + (block.header ? 1 : 0))),
    ...(grid ? [] : ["      bottomrule,"]),
    "    )",
    ...(notes ? [`    block(width: 100%, above: 0.5em, std.align(left, text(size: 0.9em, [註：] + ${notes})))`] : []),
  ];

  // Without a caption there is no table number, so the table is placed bare
  if (!captioned) return ["#{", ...inner, "}"];

  return [
    "#figure(",
    "  {",
    ...inner,
    "  },",
    `  ${caption},`,
    "  kind: table,",
    "  supplement: table-supplement,",
    `)${label(block.label)}`,
  ];
}

/** Names of the editor languages that Typst spells differently. */
const TYPST_LANGUAGE: Record<string, string> = { shell: "bash", csharp: "cs", xml: "html", markdown: "md", plaintext: "" };

function typstLanguage(language: string | null): string {
  if (!language) return "";
  return TYPST_LANGUAGE[language] ?? language;
}

const label = (value: string | null) => (value ? ` <${value}>` : "");
const str = (value: string) => `"${escapeString(value)}"`;
const content = (nodes: Inline[], ctx: BlockContext) => `[${renderInline(nodes, ctx)}]`;

function indent(lines: string[], by: string): string[] {
  return lines.map((line) => (line === "" ? line : by + line));
}

/** Turns a block into lines, blocks are separated by a blank line by the caller. */
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
      const raw = `${fence}${typstLanguage(block.language)}\n${block.text}\n${fence}`.split("\n");
      // A code block with no caption is not a listing, so it gets no number and no label
      if (block.caption.length === 0) return raw;
      const caption = `caption: ${content(block.caption, ctx)}`;
      return [`#code(${caption})[`, ...raw, `]${label(block.label)}`];
    }

    case "math": {
      const result = convertMath(block.latex);
      if (!result.ok) {
        ctx.onMathFailure(block.latex);
        return [mathFallback(block.latex, true)];
      }
      // The template numbers every equation, so a formula without a label turns the numbering off for itself
      if (block.label === null) return ["#[", "#set math.equation(numbering: none)", `$ ${result.typst} $`, "]"];
      return [`$ ${result.typst} $${label(block.label)}`];
    }

    case "figure": {
      const width = safeLength(block.width);
      if (block.caption.length === 0) {
        // No caption means no figure number, so the image is placed bare
        return [`#align(center, image(${str(ctx.imagePath(block.src))}${width ? `, width: ${width}` : ""}))`];
      }
      const args = [str(ctx.imagePath(block.src)), `caption: ${content(block.caption, ctx)}`];
      if (width) args.push(`width: ${width}`);
      return [`#fig(${args.join(", ")})${label(block.label)}`];
    }

    case "figureGroup": {
      if (block.caption.length === 0) {
        const images = block.items.map((item) => `image(${str(ctx.imagePath(item.src))}, width: 100%)`);
        return [`#align(center, grid(columns: (1fr,) * ${Math.max(block.items.length, 1)}, column-gutter: 1em, ${images.join(", ")}))`];
      }
      const items = block.items.map((item) =>
        item.caption.length > 0
          ? `(${str(ctx.imagePath(item.src))}, ${content(item.caption, ctx)})`
          : `(${str(ctx.imagePath(item.src))},)`,
      );
      const args: string[] = [];
      if (block.layout === "grid" && block.columns) args.push(`columns: ${block.columns}`);
      args.push(`caption: ${content(block.caption, ctx)}`);
      const fn = block.layout === "grid" ? "fig-grid" : "fig-row";
      return [`#${fn}(`, ...indent([...args.map((a) => `${a},`), ...items.map((i) => `${i},`)], "  "), `)${label(block.label)}`];
    }

    case "table":
      return renderTable(block, ctx);

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

    case "div": {
      const statement = statementOfClasses(block.classes);
      if (!statement) return renderBlocks(block.children, ctx);
      const args = [`"${statement.id}"`];
      if (block.id && statement.numbered) args.push(`id: "${escapeString(block.id)}"`);
      if (block.props.title) args.push(`title: "${escapeString(block.props.title)}"`);
      return [`#statement(${args.join(", ")})[`, ...indent(renderBlocks(block.children, ctx), "  "), "]"];
    }
  }
}

/**
 * Blocks are separated by blank lines. Inside list items, controlled by inList, later paragraphs get no first line indent.
 */
export function renderBlocks(blocks: Block[], ctx: BlockContext, inList = false): string[] {
  const out: string[] = [];
  blocks.forEach((block, index) => {
    let lines = renderBlock(block, ctx);
    if (lines.length === 0) return;
    if (inList && index > 0 && block.type === "paragraph") {
      lines = ["#par(first-line-indent: 0em)[", ...indent(lines, "  "), "]"];
    }
    // Inside a list item no blank line between a paragraph and a nested list that follows, it would make a loose list
    if (out.length > 0 && !(inList && block.type === "list")) out.push("");
    out.push(...lines);
  });
  return out;
}
