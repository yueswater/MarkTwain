import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { bulletSymbol, formatOrdered, levelAt } from "@marktwain/schema";

export const LIST_LEVELS_CHANGED = "marktwain:list-levels-changed";

export type ListMarkerOptions = {
  /** The markers of the levels the thesis settings choose, null for a kind that keeps the look of the template */
  getLevels: () => { ordered: string[] | null; bullet: string[] | null };
};

/**
 * Shows the marker that the thesis settings give to each level of a list, 一、 then (一) then 1., by decoration and without changing the
 * document, so the Markdown stays 1. and - and the markers can be switched at any time.
 */
export const ListMarkers = Extension.create<ListMarkerOptions>({
  name: "listMarkers",

  addOptions() {
    return { getLevels: () => ({ ordered: null, bullet: null }) };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const { ordered, bullet } = options.getLevels();
            if (!ordered && !bullet) return DecorationSet.empty;
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "listItem") return true;
              const $pos = state.doc.resolve(pos);
              const list = $pos.parent;
              const isOrdered = list.type.name === "orderedList";
              const levels = isOrdered ? ordered : bullet;
              if (!levels) return true;
              // The depth counts the lists of the same kind that hold the item, itself included
              let depth = 0;
              for (let d = $pos.depth; d >= 0; d -= 1) if ($pos.node(d).type === list.type) depth += 1;
              const level = levelAt(levels, depth);
              if (!level) return true;
              const marker = isOrdered ? formatOrdered(level, (Number(list.attrs.start) || 1) + $pos.index()) : bulletSymbol(level);
              decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-marker": marker }));
              return true;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
