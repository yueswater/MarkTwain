import { allKeys, effectiveEdges, parseBorders, type Edge, type Edges, type Grid } from "@marktwain/schema";

/** The stroke of Typst for a line, Typst has no double line so that one is drawn solid. */
export function strokeOf(edge: NonNullable<Edge>): string {
  const dash = edge.style === "dashed" ? `, dash: "dashed"` : edge.style === "dotted" ? `, dash: "dotted"` : "";
  const paint = edge.color ? `paint: rgb("${edge.color}"), ` : "";
  return `(${paint}thickness: ${edge.width}pt${dash})`;
}

type Pieces = { grid: Grid; edges: Edges };

/** The lines of a table, the preset with the rules of the attribute on top. */
export function tableLines(grid: Grid, borders: string): Pieces {
  return { grid, edges: effectiveEdges(grid, parseBorders(borders)) };
}

const sameEdge = (a: Edge, b: Edge) => a !== null && b !== null && a.width === b.width && a.style === b.style && a.color === b.color;

/** The hline and vline entries of a table, a line that is the same along several cells is one entry. */
export function lineEntries({ grid, edges }: Pieces): string[] {
  const out: string[] = [];
  const runs = (count: number, length: number, edgeAt: (line: number, along: number) => Edge, emit: (line: number, from: number, to: number, edge: NonNullable<Edge>) => void) => {
    for (let line = 0; line < count; line += 1) {
      let from = 0;
      for (let along = 1; along <= length; along += 1) {
        const first = edgeAt(line, from);
        if (along < length && sameEdge(first, edgeAt(line, along))) continue;
        if (first) emit(line, from, along, first);
        from = along;
      }
    }
  };
  runs(grid.rows + 1, grid.cols, (y, x) => edges.get(`h:${y}:${x}`) ?? null, (y, from, to, edge) =>
    out.push(`table.hline(y: ${y}, start: ${from}, end: ${to}, stroke: ${strokeOf(edge)})`));
  runs(grid.cols + 1, grid.rows, (x, y) => edges.get(`v:${x}:${y}`) ?? null, (x, from, to, edge) =>
    out.push(`table.vline(x: ${x}, start: ${from}, end: ${to}, stroke: ${strokeOf(edge)})`));
  return out;
}

/**
 * The diagonals of the cell that starts at the position, as lines drawn over the cell, empty when it has none.
 * The cell is measured to know where its corners are, so a diagonal reaches them when the cell is as tall as its own text.
 */
export function diagonalCell(pieces: Pieces, row: number, column: number, body: string): string | null {
  const down = pieces.edges.get(`dd:${row}:${column}`);
  const up = pieces.edges.get(`du:${row}:${column}`);
  if (!down && !up) return null;
  const lines = [
    ...(down ? [`place(top + left, line(start: (0pt, 0pt), end: (size.width, height), stroke: ${strokeOf(down)}))`] : []),
    ...(up ? [`place(top + left, line(start: (0pt, height), end: (size.width, 0pt), stroke: ${strokeOf(up)}))`] : []),
  ];
  return `[#layout(size => { let inner = box(width: size.width, inset: (x: 0.6em, y: 0.45em), ${body}); let height = measure(inner).height; inner; ${lines.join("; ")} })]`;
}

export { allKeys };
