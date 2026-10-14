import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { widthsFromTable } from "../table-commands";

/**
 * Keeps the widths attribute of a table in step with the column widths that the user drags.
 * The editor stores pixels on the cells and the document stores percentages on the table.
 * It also marks every table with its style so CSS can draw three-line or grid tables.
 */
export const TableExtras = Extension.create({
  name: "tableExtras",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "table") return true;
              decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-table-style": String(node.attrs.style) }));
              return false;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged)) return null;
          let tr = state.tr;
          let changed = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name !== "table") return true;
            const widths = widthsFromTable(node);
            // Only touch a table that has pixel widths, a parsed one with percentages is left alone
            if (widths !== "" && widths !== node.attrs.widths) {
              tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, widths });
              changed = true;
            }
            return false;
          });
          return changed ? tr : null;
        },
      }),
    ];
  },
});
