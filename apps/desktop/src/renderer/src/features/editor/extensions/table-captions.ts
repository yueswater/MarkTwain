import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type TableCaptionOptions = {
  /** How many captioned tables come before this document */
  getBase: () => number;
  /** Above or below the table, a setting of the thesis */
  getPosition: () => "top" | "bottom";
  /** The word before the number, 表 or Table */
  getPrefix: () => string;
  /** The word before the notes */
  getNotesLabel: () => string;
};

/**
 * Draws the number and the caption of a table, and its notes, where the PDF has them. Without a caption the table has no number.
 * The text is not part of the document, it is read from the attributes of the table.
 */
export const TableCaptions = Extension.create<TableCaptionOptions>({
  name: "tableCaptions",

  addOptions() {
    return { getBase: () => 0, getPosition: () => "bottom", getPrefix: () => "Table", getNotesLabel: () => "" };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            let counted = options.getBase();
            const position = options.getPosition();
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "table") return true;
              const caption = String(node.attrs.caption ?? "").trim();
              const notes = String(node.attrs.notes ?? "").trim();
              if (caption) counted += 1;
              if (!caption && !notes) return false;
              const text = caption ? `${options.getPrefix()} ${counted}　${caption.replace(/[*_`$]/g, "")}` : "";
              const note = notes ? `${options.getNotesLabel()}${notes.replace(/[*_`$]/g, "")}` : "";
              const line = (className: string, content: string) => () => {
                const box = document.createElement("div");
                box.className = className;
                box.contentEditable = "false";
                box.textContent = content;
                return box;
              };
              const end = pos + node.nodeSize;
              // The notes sit right under the table, the caption goes above the table or under the notes
              if (text) decorations.push(Decoration.widget(position === "top" ? pos : end, line("table-caption", text), { side: position === "top" ? -1 : 1, key: `c:${position}:${text}`, ignoreSelection: true }));
              if (note) decorations.push(Decoration.widget(end, line("table-notes", note), { side: -1, key: `n:${note}`, ignoreSelection: true }));
              return false;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
