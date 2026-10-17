import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type FigureCaptionOptions = {
  /** How many captioned figures come before this document */
  getBase: () => number;
  /** The word before the number, 圖 or Figure */
  getPrefix: () => string;
};

/**
 * Gives a figure with a caption its number before the caption, as a table has it, 圖 1 and the caption. Without a caption a figure has no number.
 * The number is not part of the document, the stylesheet draws it from the variable that the decoration sets.
 */
export const FigureCaptions = Extension.create<FigureCaptionOptions>({
  name: "figureCaptions",

  addOptions() {
    return { getBase: () => 0, getPrefix: () => "Figure" };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            let counted = options.getBase();
            const prefix = options.getPrefix().replace(/["\\]/g, "");
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "figure") return true;
              if (!String(node.attrs.caption ?? "").trim()) return false;
              counted += 1;
              decorations.push(Decoration.node(pos, pos + node.nodeSize, { style: `--caption-number: "${prefix} ${counted}　"` }));
              return false;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
