import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { TableMap, findTable } from "@tiptap/pm/tables";
import { TextSelection } from "@tiptap/pm/state";

/** Width in pixels that the editor gives a table, percentages are measured against it. */
export const EDITOR_TABLE_PX = 700;

/** Sets the alignment of every cell in the column of the selection. */
export function setColumnAlign(editor: Editor, align: "left" | "center" | "right"): boolean {
  const { state } = editor;
  const table = findTable(state.selection.$from);
  if (!table) return false;
  const map = TableMap.get(table.node);
  const cell = state.doc.resolve(state.selection.from);
  // Column of the cell that holds the cursor
  let column = -1;
  for (let depth = cell.depth; depth > 0; depth -= 1) {
    const name = cell.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") {
      column = map.colCount(cell.before(depth) - table.start);
      break;
    }
  }
  if (column < 0) return false;
  const tr = state.tr;
  const seen = new Set<number>();
  for (let row = 0; row < map.height; row += 1) {
    const offset = map.map[row * map.width + column];
    if (offset === undefined || seen.has(offset)) continue;
    seen.add(offset);
    const node = table.node.nodeAt(offset);
    if (node) tr.setNodeMarkup(table.start + offset, undefined, { ...node.attrs, align });
  }
  editor.view.dispatch(tr);
  return true;
}

/** Sets the height of the row that holds the cursor, null clears it. */
export function setRowHeight(editor: Editor, height: string | null): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "tableRow") {
      editor.view.dispatch(editor.state.tr.setNodeMarkup($from.before(depth), undefined, { ...node.attrs, height }));
      return true;
    }
  }
  return false;
}

export function currentRowHeight(editor: Editor): string {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "tableRow") return String(node.attrs.height ?? "");
  }
  return "";
}

/** One entry per column, a width in percent of the editor table or "auto". */
export function widthsFromTable(table: PmNode): string {
  const map = TableMap.get(table);
  const px: (number | null)[] = Array.from({ length: map.width }, () => null);
  for (let col = 0; col < map.width; col += 1) {
    for (let row = 0; row < map.height; row += 1) {
      const offset = map.map[row * map.width + col];
      const cell = offset === undefined ? null : table.nodeAt(offset);
      const widths = cell?.attrs.colwidth as number[] | null | undefined;
      if (!cell || !widths) continue;
      const start = map.colCount(offset as number);
      const value = widths[col - start];
      if (typeof value === "number" && value > 0) {
        px[col] = value;
        break;
      }
    }
  }
  if (px.every((w) => w === null)) return "";
  return px.map((w) => (w === null ? "auto" : `${Math.round((w / EDITOR_TABLE_PX) * 1000) / 10}%`)).join(",");
}

/** Puts the cursor into the first cell of the table, used after inserting one. */
export function focusFirstCell(editor: Editor, tablePos: number): void {
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(tablePos + 3))));
}
