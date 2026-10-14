import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { CellSelection, TableMap, findTable } from "@tiptap/pm/tables";
import { effectiveEdges, normalizeBorders, parseBorders, type Edges, type Grid, type Line } from "@marktwain/schema";
import { applyItem, applyPen, isOn, type BorderItem, type Rect } from "./table-border-items";

/** The grid of a table node, rows and columns with merged cells counted once. */
export function gridOf(table: PmNode): { grid: Grid; map: TableMap } {
  const map = TableMap.get(table);
  const firstRow = table.firstChild;
  let header = firstRow !== null && firstRow.childCount > 0;
  firstRow?.forEach((cell) => {
    if (cell.type.name !== "tableHeader") header = false;
  });
  const grid: Grid = {
    rows: map.height,
    cols: map.width,
    header,
    style: table.attrs.style === "grid" ? "grid" : "three-line",
    area: (row, column) => map.map[row * map.width + column] ?? -1,
  };
  return { grid, map };
}

/** The lines of a table node as they are drawn, the preset with its borders on top. */
export function edgesOf(table: PmNode): { grid: Grid; edges: Edges; map: TableMap } {
  const { grid, map } = gridOf(table);
  return { grid, map, edges: effectiveEdges(grid, parseBorders(String(table.attrs.borders ?? ""))) };
}

export type TableSelection = { pos: number; node: PmNode; grid: Grid; edges: Edges; rect: Rect };

/** The table at the cursor with the cells that are selected, or all of its cells when none are. */
export function readTable(editor: Editor): TableSelection | null {
  const found = findTable(editor.state.selection.$from);
  if (!found) return null;
  const { grid, edges, map } = edgesOf(found.node);
  let rect: Rect = { top: 0, left: 0, bottom: grid.rows, right: grid.cols };
  const selection = editor.state.selection;
  if (selection instanceof CellSelection) {
    const picked = map.rectBetween(selection.$anchorCell.pos - found.start, selection.$headCell.pos - found.start);
    rect = { top: picked.top, left: picked.left, bottom: picked.bottom, right: picked.right };
  }
  return { pos: found.pos, node: found.node, grid, edges, rect };
}

/** Which items of the menu are on for the selection. */
export function itemStates(editor: Editor, items: readonly BorderItem[]): Record<string, boolean> {
  const table = readTable(editor);
  return Object.fromEntries(items.map((item) => [item, table ? isOn(item, table.edges, table.rect, table.grid) : false]));
}

function write(editor: Editor, table: TableSelection, edges: Edges): void {
  const { style, borders } = normalizeBorders(table.grid, edges);
  // One transaction, so one step of undo
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.setNodeMarkup(table.pos, undefined, { ...table.node.attrs, style, borders });
      return true;
    })
    .run();
}

export function applyBorderItem(editor: Editor, item: BorderItem, pen: Line): void {
  const table = readTable(editor);
  if (table) write(editor, table, applyItem(item, table.edges, table.rect, table.grid, pen));
}

export function applyBorderPen(editor: Editor, pen: Line): void {
  const table = readTable(editor);
  if (table) write(editor, table, applyPen(table.edges, table.rect, table.grid, pen));
}
