import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { isPlacement } from "@marktwain/schema";

const FLOATING = new Set(["figure", "figureGroup", "table"]);

/** Marks a figure or a table that has a placement of its own, CSS draws a small sign at its corner. The document is not changed. */
export const PlacementMarks = Extension.create({
  name: "placementMarks",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!FLOATING.has(node.type.name)) return true;
              if (isPlacement(node.attrs.placement)) decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-placement-mark": node.attrs.placement }));
              return node.type.name === "figureGroup";
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
