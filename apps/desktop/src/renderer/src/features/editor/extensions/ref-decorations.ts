import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { citationDisplay, describeRef, type CitationInfo } from "../references/ref-display";

export const REFS_CHANGED = "marktwain:refs-changed";
const key = new PluginKey("marktwainRefs");

export type RefDecorationOptions = {
  getNumbers: () => Readonly<Record<string, string>>;
  kindName: (kind: string) => string;
  brokenText: string;
  /** Author and year of every key of the bibliography */
  getCitations: () => Readonly<Record<string, CitationInfo>>;
};

/**
 * Adds display text to footnotes, which get a number, cross-references, which get the number of the target, and citations, which get the author and the year, without changing the document.
 * Display text lives in data attributes of the node and CSS ::after renders it. It is recomputed when content changes or REFS_CHANGED arrives.
 */
export const RefDecorations = Extension.create<RefDecorationOptions>({
  name: "refDecorations",

  addOptions() {
    return { getNumbers: () => ({}), kindName: (kind) => kind, brokenText: "?", getCitations: () => ({}) };
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
              } else if (node.type.name === "blockMath") {
                // A formula with a name is numbered, the number is written in brackets at its right edge
                const number = typeof node.attrs.label === "string" ? numbers[node.attrs.label] : undefined;
                if (number !== undefined) decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-eq-number": number }));
              } else if (node.type.name === "citation") {
                const cite = citationDisplay(node.attrs.keys as string[], String(node.attrs.form), options.getCitations());
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    "data-display": cite.text,
                    ...(cite.broken ? { "data-broken": "" } : {}),
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
