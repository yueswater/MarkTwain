import { effectiveEdges, hKey, parseBorders, parseMarkdown, vKey, type Edge } from "@marktwain/schema";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Cell = { type: string; attrs?: { colspan?: number; rowspan?: number; align?: string | null }; content?: { content?: { text?: string; marks?: unknown[]; type?: string; attrs?: { latex?: string } }[] }[] };
type Row = { content?: Cell[] };
type TableNode = { attrs?: { style?: string; caption?: string; borders?: string }; content?: Row[] };

function textOf(cell: Cell): { text: string; bold: boolean } {
  const parts = (cell.content ?? []).flatMap((paragraph) => paragraph.content ?? []);
  return { text: parts.map((part) => part.text ?? (part.type === "inlineMath" ? (part.attrs?.latex ?? "") : "")).join(""), bold: parts.some((part) => (part.marks ?? []).length > 0) };
}

const css = (edge: Edge | undefined) => (edge ? `${Math.max(edge.width, 0.5)}px ${edge.style} ${edge.color ?? "currentColor"}` : "none");

/** The row and the column where each cell of the rows starts, the cells that a merged one covers are skipped. */
function placeCells(rows: Row[]): { row: number; col: number }[][] {
  const covered = new Set<string>();
  return rows.map((row, r) => {
    let c = 0;
    return (row.content ?? []).map((cell) => {
      while (covered.has(`${r}.${c}`)) c += 1;
      const colspan = cell.attrs?.colspan ?? 1;
      const rowspan = cell.attrs?.rowspan ?? 1;
      for (let dr = 0; dr < rowspan; dr += 1) for (let dc = 0; dc < colspan; dc += 1) covered.add(`${r + dr}.${c + dc}`);
      const start = c;
      c += colspan;
      return { row: r, col: start };
    });
  });
}

/** A small drawing of a table written in Markdown, with merged cells and the lines of its style, so a template can be seen before it is inserted. */
export function TablePreview({ markdown }: { markdown: string }) {
  const table = useMemo(() => (parseMarkdown(markdown).content?.[0] as TableNode | undefined) ?? null, [markdown]);
  if (!table) return null;
  const grid = table.attrs?.style === "grid";
  const rows = table.content ?? [];
  // A table with its own lines is drawn from them, the others from the preset of their style
  const custom = (table.attrs?.borders ?? "") !== "";
  const places = placeCells(rows);
  const columns = Math.max(0, ...rows.map((row, r) => (places[r]?.at(-1)?.col ?? -1) + (row.content?.at(-1)?.attrs?.colspan ?? 1)));
  const edges = custom
    ? effectiveEdges({ rows: rows.length, cols: columns, header: !grid, style: grid ? "grid" : "three-line" }, parseBorders(table.attrs?.borders ?? ""))
    : null;
  return (
    <figure className="grid gap-1.5" data-testid="table-preview">
      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse text-xs", !grid && !custom && "border-y-2 border-foreground")}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={cn(!grid && !custom && rowIndex === 0 && "border-b border-foreground")}>
                {(row.content ?? []).map((cell, cellIndex) => {
                  const { text, bold } = textOf(cell);
                  const at = places[rowIndex]?.[cellIndex];
                  const colspan = cell.attrs?.colspan ?? 1;
                  const rowspan = cell.attrs?.rowspan ?? 1;
                  const drawn =
                    edges && at
                      ? {
                          borderTop: css(edges.get(hKey(at.row, at.col))),
                          borderBottom: css(edges.get(hKey(at.row + rowspan, at.col))),
                          borderLeft: css(edges.get(vKey(at.col, at.row))),
                          borderRight: css(edges.get(vKey(at.col + colspan, at.row))),
                        }
                      : {};
                  return (
                    <td
                      key={cellIndex}
                      colSpan={cell.attrs?.colspan ?? 1}
                      rowSpan={cell.attrs?.rowspan ?? 1}
                      style={{ textAlign: (cell.attrs?.align as "left" | "center" | "right" | null | undefined) ?? "center", ...drawn }}
                      className={cn("px-2 py-1", grid && !custom && "border border-foreground/70", bold && "font-semibold")}
                    >
                      {text.replace(/\*\*/g, "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.attrs?.caption && <figcaption className="text-center text-xs text-muted-foreground">{table.attrs.caption}</figcaption>}
    </figure>
  );
}
