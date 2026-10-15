import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { EDITOR_TABLE_PX } from "../tables/table-commands";

/**
 * A table fills the text column as it does in the PDF, with its columns in the shares that the widths say.
 * The table extension keeps columns in pixels of a table 700 pixels wide and overflows a narrower column, so the
 * columns are turned into shares of the table after every update.
 */
function fit(view: EditorView): void {
  for (const table of view.dom.querySelectorAll<HTMLTableElement>(".tableWrapper table")) {
    table.style.width = "100%";
    table.style.minWidth = "0";
    table.style.tableLayout = "fixed";
    for (const col of table.querySelectorAll<HTMLElement>("col")) {
      const pixels = Number.parseFloat(col.style.width);
      if (Number.isFinite(pixels) && col.style.width.endsWith("px")) col.style.width = `${(pixels / EDITOR_TABLE_PX) * 100}%`;
    }
  }
}

export const TableLayout = Extension.create({
  name: "tableLayout",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view(view) {
          requestAnimationFrame(() => fit(view));
          return { update: (next) => fit(next) };
        },
      }),
    ];
  },
});
