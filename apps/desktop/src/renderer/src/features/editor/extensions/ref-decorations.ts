import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { citationText, describeRef } from "../ref-display";

export const REFS_CHANGED = "marktwain:refs-changed";
const key = new PluginKey("marktwainRefs");

export type RefDecorationOptions = {
  getNumbers: () => Readonly<Record<string, string>>;
  kindName: (kind: string) => string;
  brokenText: string;
};

/**
 * Adds display text to footnotes, which get a number, cross-references, which get the number of the target, and citations, which get the keys, without changing the document.
 * Display text lives in data attributes of the node and CSS ::after renders it. It is recomputed when content changes or REFS_CHANGED arrives.
 */
export const RefDecorations = Extension.create<RefDecorationOptions>({
  name: "refDecorations",

  addOptions() {
    return { getNumbers: () => ({}), kindName: (kind) => kind, brokenText: "?" };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const numbers = options.getNumbers();
            let footnote = 0;
            state.doc.descendants((node, pos) => {
              if (node.type.name === "footnote") {
                footnote += 1;
                decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-n": String(footnote) }));
              } else if (node.type.name === "crossRef") {
                const ref = describeRef(String(node.attrs.label), numbers, options.kindName, options.brokenText);
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    "data-display": ref.text,
                    ...(ref.broken ? { "data-broken": "" } : {}),
                  }),
                );
              } else if (node.type.name === "citation") {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    "data-display": citationText(node.attrs.keys as string[], String(node.attrs.form)),
                  }),
                );
              }
              return true;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
