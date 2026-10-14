/**
 * Lines of a table that a pipe table cannot hold, kept in the borders attribute of the caption line:
 *   : caption {#tbl:x borders="h1.*=0.5;v1.1-2=1/dashed;dd0.0=0.5/solid/#ff0000;h-1.*=none"}
 * A table has horizontal lines h, numbered from the top, 0 is above the first row and rows is below the last,
 * and vertical lines v, numbered from the left. A line is cut into one piece for each cell it passes, so the attribute
 * says which pieces differ from the preset of the table, three-line or grid. dd and du are the diagonals of a cell.
 * Numbers start at 0 and -1 means the last line, so a line at the bottom stays at the bottom when rows are added.
 * A line between two cells is one piece, so the two cells never disagree.
 */
export type LineStyle = "solid" | "dashed" | "dotted" | "double";

export type Line = { width: number; style: LineStyle; color: string | null };

/** null is no line. */
export type Edge = Line | null;

export const LINE_STYLES: readonly LineStyle[] = ["solid", "dashed", "dotted", "double"];

/** Widths offered in the menu, in points, the usual values of a word processor. */
export const LINE_WIDTHS: readonly number[] = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3];

export type Rule = {
  kind: "h" | "v" | "dd" | "du";
  /** Line number, or the row of a diagonal. Negative counts from the last line. */
  index: number;
  /** Pieces along the line, from and to are inclusive, null for all */
  range: { from: number; to: number } | null;
  edge: Edge;
};

export type Grid = {
  rows: number;
  cols: number;
  /** Whether the first row is a header, the three-line preset puts a thin line under it */
  header: boolean;
  style: "three-line" | "grid";
  /** The area that covers a position, positions with the same id are one merged cell */
  area?: (row: number, col: number) => number;
};

export type Edges = Map<string, Edge>;

const COLOR = /^#[0-9a-fA-F]{6}$/;

/** Weights of the presets, the same as the three-line helper of the template and the grid of the table writer. */
const THICK = 1;
const THIN = 0.6;
const GRID = 0.5;

export const solid = (width: number): Line => ({ width, style: "solid", color: null });

export function parseLine(spec: string): Edge | undefined {
  const text = spec.trim();
  if (text === "none" || text === "0") return null;
  const [w = "", style, color] = text.split("/");
  const width = Number(w.replace(/pt$/, ""));
  if (!Number.isFinite(width) || width <= 0 || width > 20) return undefined;
  if (style !== undefined && !(LINE_STYLES as readonly string[]).includes(style)) return undefined;
  if (color !== undefined && !COLOR.test(color)) return undefined;
  return { width, style: (style as LineStyle | undefined) ?? "solid", color: color ? color.toUpperCase() : null };
}

export function formatLine(edge: Edge): string {
  if (edge === null) return "none";
  const parts = [String(edge.width)];
  if (edge.style !== "solid" || edge.color) parts.push(edge.style);
  if (edge.color) parts.push(edge.color);
  return parts.join("/");
}

const ENTRY = /^(h|v|dd|du)(-?\d+)\.(\*|\d+(?:-\d+)?)$/;

/** Reads the attribute, an entry that does not fit is dropped. */
export function parseBorders(spec: string): Rule[] {
  const rules: Rule[] = [];
  for (const entry of spec.split(";")) {
    const [key = "", value = ""] = entry.trim().split("=");
    const match = ENTRY.exec(key);
    const edge = parseLine(value);
    if (!match || edge === undefined) continue;
    const range = match[3] === "*" ? null : (() => {
      const [from = "0", to = from] = (match[3] ?? "").split("-");
      return { from: Number(from), to: Number(to) };
    })();
    if (range && range.to < range.from) continue;
    rules.push({ kind: match[1] as Rule["kind"], index: Number(match[2]), range, edge });
  }
  return rules;
}

export function formatBorders(rules: readonly Rule[]): string {
  return rules
    .map((rule) => {
      const range = rule.range === null ? "*" : rule.range.from === rule.range.to ? String(rule.range.from) : `${rule.range.from}-${rule.range.to}`;
      return `${rule.kind}${rule.index}.${range}=${formatLine(rule.edge)}`;
    })
    .join(";");
}

/** Keys: h:line:column, v:line:row, dd:row:column and du:row:column. */
export const hKey = (line: number, column: number) => `h:${line}:${column}`;
export const vKey = (line: number, row: number) => `v:${line}:${row}`;
export const dKey = (kind: "dd" | "du", row: number, column: number) => `${kind}:${row}:${column}`;

/** Every piece of line that can be drawn, in the order top to bottom. */
export function allKeys(grid: Grid): string[] {
  const keys: string[] = [];
  for (let y = 0; y <= grid.rows; y += 1) for (let x = 0; x < grid.cols; x += 1) keys.push(hKey(y, x));
  for (let x = 0; x <= grid.cols; x += 1) for (let y = 0; y < grid.rows; y += 1) keys.push(vKey(x, y));
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) keys.push(dKey("dd", r, c), dKey("du", r, c));
  }
  return keys;
}

/** A piece of line inside a merged cell is never drawn. */
export function isInterior(grid: Grid, key: string): boolean {
  const area = grid.area;
  if (!area) return false;
  const [kind, a, b] = key.split(":");
  const line = Number(a);
  const along = Number(b);
  if (kind === "h") return line > 0 && line < grid.rows && area(line - 1, along) === area(line, along);
  if (kind === "v") return line > 0 && line < grid.cols && area(along, line - 1) === area(along, line);
  return false;
}

/** The lines of the preset. */
export function baseEdges(grid: Grid): Edges {
  const edges: Edges = new Map();
  for (const key of allKeys(grid)) edges.set(key, null);
  const set = (key: string, edge: Edge) => {
    if (edges.has(key) && !isInterior(grid, key)) edges.set(key, edge);
  };
  if (grid.style === "grid") {
    for (const key of allKeys(grid)) if (/^[hv]:/.test(key)) set(key, solid(GRID));
    return edges;
  }
  for (let x = 0; x < grid.cols; x += 1) {
    if (grid.header) set(hKey(1, x), solid(THIN));
    set(hKey(0, x), solid(THICK));
    set(hKey(grid.rows, x), solid(THICK));
  }
  return edges;
}

function resolveIndex(index: number, last: number): number {
  return index < 0 ? last + 1 + index : index;
}

/** The preset with the rules on top, the rules are applied in order. */
export function effectiveEdges(grid: Grid, rules: readonly Rule[]): Edges {
  const edges = baseEdges(grid);
  for (const rule of rules) {
    const horizontal = rule.kind === "h";
    const vertical = rule.kind === "v";
    const lines = horizontal ? grid.rows : vertical ? grid.cols : grid.rows - 1;
    const length = horizontal || rule.kind === "dd" || rule.kind === "du" ? grid.cols : grid.rows;
    const index = resolveIndex(rule.index, lines);
    const from = rule.range?.from ?? 0;
    const to = Math.min(rule.range?.to ?? length - 1, length - 1);
    for (let along = from; along <= to; along += 1) {
      const key = horizontal ? hKey(index, along) : vertical ? vKey(index, along) : dKey(rule.kind as "dd" | "du", index, along);
      if (edges.has(key) && !isInterior(grid, key)) edges.set(key, rule.edge);
    }
  }
  return edges;
}

const sameEdge = (a: Edge | undefined, b: Edge | undefined) =>
  (a ?? null) === (b ?? null) || (!!a && !!b && a.width === b.width && a.style === b.style && a.color === b.color);

/** Whether the lines are exactly those of a preset. */
export function matchesPreset(grid: Grid, edges: Edges, style: Grid["style"]): boolean {
  const base = baseEdges({ ...grid, style });
  return allKeys(grid).every((key) => isInterior(grid, key) || sameEdge(edges.get(key), base.get(key)));
}

/** The rules that turn the preset of the grid into the given lines, the shortest list, a line that is the same all along is one entry. */
export function diffRules(grid: Grid, edges: Edges): Rule[] {
  const base = baseEdges(grid);
  const rules: Rule[] = [];
  const lastLine = (kind: Rule["kind"]) => (kind === "h" ? grid.rows : kind === "v" ? grid.cols : -2);

  const lineRules = (kind: "h" | "v" | "dd" | "du", count: number, length: number, key: (line: number, along: number) => string) => {
    for (let line = 0; line < count; line += 1) {
      // Pieces that differ, grouped into runs of the same line
      let run: { from: number; edge: Edge } | null = null;
      const runs: { from: number; to: number; edge: Edge }[] = [];
      for (let along = 0; along <= length; along += 1) {
        const k = along < length ? key(line, along) : "";
        const differs = along < length && !isInterior(grid, k) && !sameEdge(edges.get(k), base.get(k));
        const edge = differs ? (edges.get(k) ?? null) : undefined;
        if (run && (!differs || !sameEdge(run.edge, edge ?? null))) {
          runs.push({ from: run.from, to: along - 1, edge: run.edge });
          run = null;
        }
        if (differs && !run) run = { from: along, edge: edge ?? null };
      }
      for (const piece of runs) {
        const whole = piece.from === 0 && piece.to === length - 1;
        const index = line === lastLine(kind) ? -1 : line;
        rules.push({ kind, index, range: whole ? null : { from: piece.from, to: piece.to }, edge: piece.edge });
      }
    }
  };
  lineRules("h", grid.rows + 1, grid.cols, hKey);
  lineRules("v", grid.cols + 1, grid.rows, vKey);
  for (const kind of ["dd", "du"] as const) lineRules(kind, grid.rows, grid.cols, (row, column) => dKey(kind, row, column));
  return rules;
}

/** What to write for the lines of a table, the preset and the attribute. */
export function normalizeBorders(grid: Grid, edges: Edges): { style: Grid["style"]; borders: string } {
  for (const style of [grid.style, grid.style === "grid" ? "three-line" : "grid"] as const) {
    if (matchesPreset(grid, edges, style)) return { style, borders: "" };
  }
  return { style: grid.style, borders: formatBorders(diffRules(grid, edges)) };
}
