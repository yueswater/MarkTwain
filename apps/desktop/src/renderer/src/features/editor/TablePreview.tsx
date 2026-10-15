import { parseMarkdown } from "@marktwain/schema";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Cell = { type: string; attrs?: { colspan?: number; rowspan?: number; align?: string | null }; content?: { content?: { text?: string; marks?: unknown[] }[] }[] };
type Row = { content?: Cell[] };
type TableNode = { attrs?: { style?: string; caption?: string }; content?: Row[] };

function textOf(cell: Cell): { text: string; bold: boolean } {
  const parts = (cell.content ?? []).flatMap((paragraph) => paragraph.content ?? []);
  return { text: parts.map((part) => part.text ?? "").join(""), bold: parts.some((part) => (part.marks ?? []).length > 0) };
}

/** A small drawing of a table written in Markdown, with merged cells and the lines of its style, so a template can be seen before it is inserted. */
export function TablePreview({ markdown }: { markdown: string }) {
  const table = useMemo(() => (parseMarkdown(markdown).content?.[0] as TableNode | undefined) ?? null, [markdown]);
  if (!table) return null;
  const grid = table.attrs?.style === "grid";
  const rows = table.content ?? [];
  return (
    <figure className="grid gap-1.5" data-testid="table-preview">
      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse text-xs", !grid && "border-y-2 border-foreground")}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={cn(!grid && rowIndex === 0 && "border-b border-foreground")}>
                {(row.content ?? []).map((cell, cellIndex) => {
                  const { text, bold } = textOf(cell);
                  return (
                    <td
                      key={cellIndex}
                      colSpan={cell.attrs?.colspan ?? 1}
                      rowSpan={cell.attrs?.rowspan ?? 1}
                      style={{ textAlign: (cell.attrs?.align as "left" | "center" | "right" | null | undefined) ?? "center" }}
                      className={cn("px-2 py-1", grid && "border border-foreground/70", bold && "font-semibold")}
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
