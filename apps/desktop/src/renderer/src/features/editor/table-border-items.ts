import { dKey, hKey, isInterior, vKey, type Edge, type Edges, type Grid, type Line } from "@marktwain/schema";

/** The items of the borders menu, the same as the borders button of a word processor. */
export const BORDER_ITEMS = [
  "bottom",
  "top",
  "left",
  "right",
  "none",
  "all",
  "outside",
  "inside",
  "insideH",
  "insideV",
  "diagonalDown",
  "diagonalUp",
  "horizontalLine",
] as const;

export type BorderItem = (typeof BORDER_ITEMS)[number];

/** Cells of the selection in grid positions, bottom and right are one past the last. */
export type Rect = { top: number; left: number; bottom: number; right: number };

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

const horizontal = (grid: Grid, rect: Rect, lines: number[]) => lines.flatMap((y) => range(rect.left, rect.right).map((x) => hKey(y, x)));
const vertical = (rect: Rect, lines: number[]) => lines.flatMap((x) => range(rect.top, rect.bottom).map((y) => vKey(x, y)));

/** The pieces of line that an item is about, pieces inside a merged cell left out. */
export function targetKeys(item: BorderItem, rect: Rect, grid: Grid): string[] {
  const cells = range(rect.top, rect.bottom).flatMap((r) => range(rect.left, rect.right).map((c) => [r, c] as const));
  let keys: string[];
  switch (item) {
    case "bottom":
      keys = horizontal(grid, rect, [rect.bottom]);
      break;
    case "top":
      keys = horizontal(grid, rect, [rect.top]);
      break;
    case "left":
      keys = vertical(rect, [rect.left]);
      break;
    case "right":
      keys = vertical(rect, [rect.right]);
      break;
    case "outside":
      keys = [...horizontal(grid, rect, [rect.top, rect.bottom]), ...vertical(rect, [rect.left, rect.right])];
      break;
    case "insideH":
      keys = horizontal(grid, rect, range(rect.top + 1, rect.bottom));
      break;
    case "insideV":
      keys = vertical(rect, range(rect.left + 1, rect.right));
      break;
    case "inside":
      keys = [...horizontal(grid, rect, range(rect.top + 1, rect.bottom)), ...vertical(rect, range(rect.left + 1, rect.right))];
      break;
    case "all":
      keys = [...horizontal(grid, rect, range(rect.top, rect.bottom + 1)), ...vertical(rect, range(rect.left, rect.right + 1))];
      break;
    case "none":
      keys = [
        ...horizontal(grid, rect, range(rect.top, rect.bottom + 1)),
        ...vertical(rect, range(rect.left, rect.right + 1)),
        ...cells.flatMap(([r, c]) => [dKey("dd", r, c), dKey("du", r, c)]),
      ];
      break;
    case "diagonalDown":
      keys = cells.map(([r, c]) => dKey("dd", r, c));
      break;
    case "diagonalUp":
      keys = cells.map(([r, c]) => dKey("du", r, c));
      break;
    case "horizontalLine":
      // A rule under the row across the whole table, a divider between groups of rows
      keys = horizontal(grid, { ...rect, left: 0, right: grid.cols }, [rect.bottom]);
      break;
  }
  return keys.filter((key) => !isInterior(grid, key));
}

/** Whether an item is on for the selection: all its lines are there, or for no border none of them is. */
export function isOn(item: BorderItem, edges: Edges, rect: Rect, grid: Grid): boolean {
  const keys = targetKeys(item, rect, grid);
  if (keys.length === 0) return false;
  return item === "none" ? keys.every((key) => !edges.get(key)) : keys.every((key) => !!edges.get(key));
}

/** The lines after an item is clicked, one that is on turns off and one that is off is drawn with the pen. */
export function applyItem(item: BorderItem, edges: Edges, rect: Rect, grid: Grid, pen: Line): Edges {
  const next = new Map(edges);
  const turnOff = item === "none" || isOn(item, edges, rect, grid);
  for (const key of targetKeys(item, rect, grid)) next.set(key, turnOff ? null : pen);
  return next;
}

/** The pen applied to the lines that are already drawn around and inside the selection. */
export function applyPen(edges: Edges, rect: Rect, grid: Grid, pen: Line): Edges {
  const next = new Map(edges);
  for (const key of targetKeys("all", rect, grid)) if (next.get(key)) next.set(key, pen);
  for (const key of targetKeys("none", rect, grid)) if (key.startsWith("d") && next.get(key)) next.set(key, pen);
  return next;
}

export const edgeOf = (edges: Edges, key: string): Edge => edges.get(key) ?? null;
