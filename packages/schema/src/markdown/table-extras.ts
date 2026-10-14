/**
 * Table features that a pipe table cannot hold, kept as attributes on the caption line:
 *   : caption {#tbl:x style=grid widths="20%,auto,30%" heights="2:30pt" cells="2.1:colspan=2;3.2:rowspan=2,align=center"}
 * Row and column numbers start at 1 and count placeholder cells, which a pipe table needs for every merged cell.
 */
export type CellExtra = {
  colspan?: number;
  rowspan?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
};

export const LENGTH = /^\d+(\.\d+)?(%|pt|cm|mm|in|em)$/;
const ALIGN = new Set(["left", "center", "right"]);
const VALIGN = new Set(["top", "middle", "bottom"]);

/** Keys look like "2.1", row then column. */
export function parseCells(spec: string): Map<string, CellExtra> {
  const out = new Map<string, CellExtra>();
  for (const entry of spec.split(";")) {
    const [position, rest = ""] = entry.trim().split(":");
    if (!position || !/^\d+\.\d+$/.test(position)) continue;
    const extra: CellExtra = {};
    for (const pair of rest.split(",")) {
      const [key, value = ""] = pair.trim().split("=");
      if ((key === "colspan" || key === "rowspan") && /^\d+$/.test(value) && Number(value) > 1) extra[key] = Number(value);
      else if (key === "align" && ALIGN.has(value)) extra.align = value as CellExtra["align"];
      else if (key === "valign" && VALIGN.has(value)) extra.valign = value as CellExtra["valign"];
    }
    if (Object.keys(extra).length > 0) out.set(position, extra);
  }
  return out;
}

export function formatCells(entries: Map<string, CellExtra>): string {
  const order = (p: string) => p.split(".").map(Number) as [number, number];
  return [...entries.entries()]
    .sort(([a], [b]) => order(a)[0] - order(b)[0] || order(a)[1] - order(b)[1])
    .map(([position, extra]) => {
      const pairs = (["colspan", "rowspan", "align", "valign"] as const)
        .filter((key) => extra[key] !== undefined)
        .map((key) => `${key}=${extra[key]}`);
      return `${position}:${pairs.join(",")}`;
    })
    .join(";");
}

/** "2:30pt,4:2em" gives row 2 and row 4, invalid entries are dropped. */
export function parseHeights(spec: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const entry of spec.split(",")) {
    const [row, length = ""] = entry.trim().split(":");
    if (row && /^\d+$/.test(row) && LENGTH.test(length)) out.set(Number(row), length);
  }
  return out;
}

export function formatHeights(heights: Map<number, string>): string {
  return [...heights.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, length]) => `${row}:${length}`)
    .join(",");
}

/** "20%,auto,30%" gives one entry per column, null for auto, invalid entries become auto. */
export function parseWidths(spec: string): (string | null)[] {
  if (spec.trim() === "") return [];
  return spec.split(",").map((part) => (LENGTH.test(part.trim()) ? part.trim() : null));
}

export function formatWidths(widths: (string | null)[]): string {
  return widths.every((w) => w === null) ? "" : widths.map((w) => w ?? "auto").join(",");
}

/** A string of widths that is safe to store, anything invalid is turned into auto. */
export function normalizeWidths(spec: string): string {
  return formatWidths(parseWidths(spec));
}
