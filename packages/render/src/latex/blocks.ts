import { effectiveEdges, effectivePlacement, latexPlacement, parseBorders, statementOfClasses, type Edge, type Grid, type Placement } from "@marktwain/schema";
import type { Align, Block, Cell, Inline } from "../ir/types";
import { CODE_END, texLength } from "./escape";
import { renderInline, type InlineContext } from "./inline";
import { displayMath, mathFallback } from "./math";

/** What floats where when a figure or a table says nothing, the settings of the thesis. */
export type PlacementDefaults = { figure: Placement; table: Placement };

const HERE: PlacementDefaults = { figure: "here", table: "here" };

export type BlockContext = InlineContext & {
  /** Placement of figures that have none of their own, a figure stays in the text when missing */
  defaultPlacement?: PlacementDefaults;
  /** Image path in the project to the path in the build directory */
  imagePath: (src: string) => string;
  /** Called with the name of a feature that LaTeX output only approximates, so the build can report it */
  onUnsupported?: (feature: string) => void;
};

/** Names of the editor languages in listings, a language that listings does not know is set as plain text. */
const LISTINGS_LANGUAGE: Record<string, string> = {
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "[Sharp]C",
  go: "Go",
  haskell: "Haskell",
  html: "HTML",
  xml: "XML",
  lua: "Lua",
  matlab: "Matlab",
  octave: "Octave",
  perl: "Perl",
  php: "PHP",
  r: "R",
  ruby: "Ruby",
  scala: "Scala",
  sql: "SQL",
  swift: "Swift",
  shell: "bash",
  bash: "bash",
  sh: "sh",
  tex: "latex",
  latex: "latex",
  yaml: "yaml",
};

function listingsLanguage(language: string | null): string {
  return (language && LISTINGS_LANGUAGE[language.toLowerCase()]) || "plain";
}

const label = (value: string | null) => (value ? `\\label{${value}}` : "");
const text = (nodes: Inline[], ctx: BlockContext) => renderInline(nodes, ctx);

const COLUMN_ALIGN: Record<Exclude<Align, null>, string> = {
  left: "\\raggedright\\arraybackslash",
  center: "\\centering\\arraybackslash",
  right: "\\raggedleft\\arraybackslash",
};

const CELL_ALIGN: Record<Exclude<Align, null>, string> = { left: "l", center: "c", right: "r" };

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

/** A table that the template's tlt can draw as is, with no merges, heights, vertical alignment or lines of its own. */
function isPlain(table: TableBlock): boolean {
  const cells = [...(table.header ?? []), ...table.rows.flat()];
  return (
    table.style === "three-line" &&
    table.borders === "" &&
    table.heights.every((h) => h === null) &&
    cells.every((c) => c.colspan === 1 && c.rowspan === 1 && c.valign === null)
  );
}

/** The share of a percentage length, 20% is 0.2, other units are not a share. */
function share(value: string | null): number | null {
  const match = value === null ? null : /^(\d+(?:\.\d+)?)%$/.exec(value);
  return match ? Number(match[1]) / 100 : null;
}

/**
 * The column specification. The tabularx of the template cannot stand in an environment that closes it itself, so every column
 * is a paragraph column of a computed width, a column with no width takes an equal part of what the others leave.
 */
function columnSpec(block: TableBlock, columnAlign: Exclude<Align, null>[], bars: boolean[], tableWidth: string): string {
  const wanted = columnAlign.map((_, i) => share(block.widths[i] ?? null));
  const taken = wanted.reduce<number>((sum, w) => sum + (w ?? 0), 0);
  const automatic = wanted.filter((w) => w === null).length;
  const rest = automatic > 0 ? Math.max(1 - taken, 0.05 * automatic) / automatic : 0;
  const spec = columnAlign.map((align, i) => {
    const fraction = Number((wanted[i] ?? rest).toFixed(4));
    return `${bars[i] ? "|" : ""}>{${COLUMN_ALIGN[align]}}p{\\dimexpr ${fraction}\\dimexpr ${tableWidth}\\relax-2\\tabcolsep\\relax}`;
  });
  return `${spec.join("")}${bars[columnAlign.length] ? "|" : ""}`;
}

type Rules = {
  /** Horizontal lines above row y, as runs of columns with the thickness in points */
  above: Map<number, { from: number; to: number; width: number }[]>;
  /** Whether a vertical line runs the whole table at the left of column x */
  bars: boolean[];
};

const sameLine = (a: Edge | undefined, b: Edge | undefined) => (a ?? null) === (b ?? null) || (!!a && !!b && a.width === b.width && a.style === b.style && a.color === b.color);

/** The lines of a table that LaTeX draws, solid lines only. */
function tableRules(block: TableBlock, area: (r: number, c: number) => number, rows: number, ctx: BlockContext): Rules {
  const grid: Grid = { rows, cols: block.columns, header: block.header !== null, style: block.style, area };
  const edges = effectiveEdges(grid, parseBorders(block.borders));
  let approximate = false;
  const above = new Map<number, { from: number; to: number; width: number }[]>();
  for (let y = 0; y <= rows; y += 1) {
    const runs: { from: number; to: number; width: number }[] = [];
    let start = 0;
    for (let x = 1; x <= block.columns; x += 1) {
      const first = edges.get(`h:${y}:${start}`) ?? null;
      if (x < block.columns && sameLine(first, edges.get(`h:${y}:${x}`))) continue;
      if (first) {
        runs.push({ from: start, to: x - 1, width: first.width });
        if (first.style !== "solid" || first.color) approximate = true;
      }
      start = x;
    }
    if (runs.length > 0) above.set(y, runs);
  }
  const bars: boolean[] = [];
  for (let x = 0; x <= block.columns; x += 1) {
    const edge = edges.get(`v:${x}:0`) ?? null;
    let whole = edge !== null;
    let partial = false;
    for (let y = 0; y < rows; y += 1) {
      const here = edges.get(`v:${x}:${y}`) ?? null;
      if (!sameLine(edge, here)) whole = false;
      if (here) partial = true;
    }
    bars.push(whole);
    if (partial && !whole) approximate = true;
    if (edge && (edge.style !== "solid" || edge.color)) approximate = true;
  }
  if ([...edges.keys()].some((key) => key.startsWith("dd:") || key.startsWith("du:")) && [...edges].some(([key, edge]) => (key.startsWith("dd:") || key.startsWith("du:")) && edge)) approximate = true;
  if (approximate) ctx.onUnsupported?.("table-lines");
  return { above, bars };
}

function ruleLine(runs: { from: number; to: number; width: number }[] | undefined, columns: number): string | null {
  if (!runs || runs.length === 0) return null;
  const first = runs[0];
  if (runs.length === 1 && first && first.from === 0 && first.to === columns - 1) return `\\Xhline{${first.width}pt}`;
  return runs.map((run) => `\\cline{${run.from + 1}-${run.to + 1}}`).join("");
}

function renderTable(block: TableBlock, ctx: BlockContext): string[] {
  const lines = renderTableBody(block, ctx);
  if (block.size === null) return lines;
  const scale = Number.parseInt(block.size, 10) / 100;
  return ["\\begingroup", `\\mtscale{${scale}}`, ...lines, "\\endgroup"];
}

function renderTableBody(block: TableBlock, ctx: BlockContext): string[] {
  const columns = block.columns;
  const first: Cell[] = block.header ?? block.rows[0] ?? [];
  const columnAlign = Array.from({ length: columns }, (_, i) => first[i]?.align ?? "center") as Exclude<Align, null>[];
  const captioned = block.caption.length > 0;
  const notes = block.notes.length > 0 ? text(block.notes, ctx) : null;
  const plain = isPlain(block);
  const width = texLength(block.width) ?? "\\linewidth";
  const all = block.header ? [block.header, ...block.rows] : block.rows;
  const starts = columnStarts(all);

  // The cells of a merged range are skipped in the rows below and to the right, a row spanning cell keeps empty cells under it
  const area = new Map<string, number>();
  let areas = 0;
  all.forEach((cells, r) =>
    cells.forEach((c, i) => {
      areas += 1;
      for (let dr = 0; dr < c.rowspan; dr += 1) for (let dc = 0; dc < c.colspan; dc += 1) area.set(`${r + dr}.${(starts[r]?.[i] ?? i) + dc}`, areas);
    }),
  );
  const rules = plain ? null : tableRules(block, (r, c) => area.get(`${r}.${c}`) ?? -(r * 1000 + c) - 1, all.length, ctx);
  if (block.heights.some((h) => h !== null)) ctx.onUnsupported?.("table-heights");
  if (all.some((row) => row.some((c) => c.valign !== null))) ctx.onUnsupported?.("table-vertical-align");

  const covered = new Set<string>();
  const rowText = (cells: Cell[], r: number): string => {
    const parts: string[] = [];
    let column = 0;
    const flushCovered = () => {
      while (covered.has(`${r}.${column}`)) {
        parts.push("");
        column += 1;
      }
    };
    for (const cell of cells) {
      flushCovered();
      for (let dr = 1; dr < cell.rowspan; dr += 1) for (let dc = 0; dc < cell.colspan; dc += 1) covered.add(`${r + dr}.${column + dc}`);
      let body = text(cell.content, ctx);
      if (cell.rowspan > 1) body = `\\multirow{${cell.rowspan}}{*}{${body}}`;
      const own = cell.align ?? columnAlign[column] ?? "center";
      const needsSpan = cell.colspan > 1 || own !== (columnAlign[column] ?? "center");
      if (needsSpan) {
        const bar = rules && column === 0 && rules.bars[0] ? "|" : "";
        const right = rules && rules.bars[column + cell.colspan] ? "|" : "";
        parts.push(`\\multicolumn{${cell.colspan}}{${bar}${CELL_ALIGN[own]}${right}}{${body}}`);
      } else {
        parts.push(body);
      }
      column += cell.colspan;
    }
    flushCovered();
    return parts.join(" & ");
  };

  const body: string[] = [];
  all.forEach((cells, r) => {
    if (rules) {
      const rule = ruleLine(rules.above.get(r), columns);
      if (rule) body.push(rule);
    }
    body.push(`${rowText(cells, r)} \\\\`);
    if (plain && r === 0 && block.header) body.push("\\midrule");
  });
  if (rules) {
    const rule = ruleLine(rules.above.get(all.length), columns);
    if (rule) body.push(rule);
  }

  const spec = columnSpec(block, columnAlign, rules?.bars ?? new Array<boolean>(columns + 1).fill(false), width);
  if (!captioned) {
    const top = plain ? ["\\toprule"] : [];
    const bottom = plain ? ["\\bottomrule"] : [];
    return ["\\begin{center}", `\\begin{tabular}{${spec}}`, ...top, ...body, ...bottom, "\\end{tabular}", "\\end{center}"];
  }
  const options = notes ? `notes={${notes}}` : "";
  const env = plain ? "tlt" : "tbl";
  return [`\\begin{${env}}[${options}]{${text(block.caption, ctx)}}{${block.label ?? ""}}{${spec}}`, ...body, `\\end{${env}}`];
}

function indent(lines: string[], by: string): string[] {
  return lines.map((line) => (line === "" ? line : by + line));
}

/** Image options, a width and the placement that the template knows. */
function figureOptions(width: string | null, placement: Placement | null, defaults: Placement): string {
  const options: string[] = [];
  const length = texLength(width);
  if (length) options.push(`width=${length}`);
  if (latexPlacement(effectivePlacement(placement, defaults))) options.push("placement=auto");
  return options.length > 0 ? `[${options.join(",")}]` : "";
}

const HEADINGS = ["chapter", "section", "subsection", "subsubsection"] as const;

/** Turns a block into lines, blocks are separated by a blank line by the caller. */
export function renderBlock(block: Block, ctx: BlockContext): string[] {
  const defaults = ctx.defaultPlacement ?? HERE;
  switch (block.type) {
    case "heading": {
      const command = HEADINGS[Math.min(Math.max(block.level, 1), 4) - 1];
      return [`\\${command}{${text(block.content, ctx)}}${label(block.label)}`];
    }

    case "paragraph": {
      const body = text(block.content, ctx);
      return body.trim() === "" ? [] : body.split("\n");
    }

    case "list": {
      const env = block.ordered ? "enumerate" : "itemize";
      const start = block.ordered && block.start !== 1 ? `[start=${block.start}]` : "";
      const lines = [`\\begin{${env}}${start}`];
      for (const item of block.items) {
        const body = renderBlocks(item, ctx, true);
        if (body.length === 0) lines.push("\\item");
        else body.forEach((line, i) => lines.push(i === 0 ? `\\item ${line}` : line));
      }
      lines.push(`\\end{${env}}`);
      return lines;
    }

    case "quote":
      return ["\\begin{quote}", ...renderBlocks(block.children, ctx), "\\end{quote}"];

    case "code": {
      // A listing that holds its own end line needs the other environment of the template
      const env = block.text.includes(CODE_END) ? "codeblock" : "lstlisting";
      const options = [`language=${listingsLanguage(block.language)}`];
      if (block.caption.length > 0) {
        options.push(`caption={${text(block.caption, ctx)}}`);
        if (block.label) options.push(`label=${block.label}`);
      }
      return [`\\begin{${env}}[${options.join(",")}]`, block.text, `\\end{${env}}`];
    }

    case "math": {
      const math = displayMath(block.latex);
      if (!math.ok) {
        ctx.onMathFailure(block.latex);
        return ["\\begin{center}", mathFallback(block.latex, true), "\\end{center}"];
      }
      if (math.env === "display") return [math.body];
      // The template numbers every equation, so a formula without a label turns the number off for itself
      const env = block.label === null ? "equation*" : "equation";
      return [`\\begin{${env}}`, ...(block.label ? [label(block.label)] : []), math.body, `\\end{${env}}`];
    }

    case "figure": {
      const path = ctx.imagePath(block.src);
      const length = texLength(block.width) ?? "0.8\\linewidth";
      // No caption means no figure number, so the image is placed bare
      if (block.caption.length === 0) return ["\\begin{center}", `\\includegraphics[width=${length}]{${path}}`, "\\end{center}"];
      return [`\\fig${figureOptions(block.width, block.placement, defaults.figure)}{${path}}{${text(block.caption, ctx)}}{${block.label ?? ""}}`];
    }

    case "figureGroup": {
      if (block.caption.length === 0) {
        const each = Number((0.96 / Math.max(block.items.length, 1)).toFixed(3));
        const images = block.items.map((item) => `\\includegraphics[width=${each}\\linewidth]{${ctx.imagePath(item.src)}}`);
        return ["\\begin{center}", images.join("\\hfill"), "\\end{center}"];
      }
      const options: string[] = [];
      if (block.layout === "grid" && block.columns) options.push(`columns=${block.columns}`);
      if (latexPlacement(effectivePlacement(block.placement, defaults.figure))) options.push("placement=auto");
      const env = block.layout === "grid" ? "figgrid" : "figrow";
      const open = `\\begin{${env}}${options.length > 0 ? `[${options.join(",")}]` : ""}{${text(block.caption, ctx)}}{${block.label ?? ""}}`;
      const items = block.items.map((item) => `\\subfig{${ctx.imagePath(item.src)}}{${text(item.caption, ctx)}}`);
      return [open, ...indent(items, "  "), `\\end{${env}}`];
    }

    case "table":
      return renderTable(block, ctx);

    case "rule":
      return ["\\par\\noindent\\hrulefill\\par"];

    case "definitionList": {
      const lines = ["\\begin{description}"];
      for (const entry of block.entries) {
        const [first = [], ...rest] = entry.descriptions.map((d) => renderBlocks(d, ctx));
        lines.push(`\\item[{${text(entry.term, ctx)}}] ${first[0] ?? ""}`, ...first.slice(1));
        for (const extra of rest) lines.push("", ...extra);
      }
      lines.push("\\end{description}");
      return lines;
    }

    case "div": {
      const statement = statementOfClasses(block.classes);
      // The pages of a thesis that are turned sideways, for wide tables
      if (block.classes.includes("landscape")) return ["\\begin{landscape}", ...renderBlocks(block.children, ctx), "\\end{landscape}"];
      if (!statement) return renderBlocks(block.children, ctx);
      const title = block.props.title ? renderInline([{ type: "text", text: block.props.title, marks: [], link: null }], ctx) : "";
      const id = block.id && statement.numbered ? block.id : "";
      return [`\\begin{mtstatement}{${statement.id}}{${title}}{${id}}`, ...renderBlocks(block.children, ctx), "\\end{mtstatement}"];
    }
  }
}

/** Blocks are separated by blank lines, inside a list item a nested list follows its paragraph without one. */
export function renderBlocks(blocks: Block[], ctx: BlockContext, inList = false): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    const lines = renderBlock(block, ctx);
    if (lines.length === 0) continue;
    if (out.length > 0 && !(inList && block.type === "list")) out.push("");
    out.push(...lines);
  }
  return out;
}
