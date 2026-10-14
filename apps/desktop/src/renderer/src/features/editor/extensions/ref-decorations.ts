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
 * 在不改文件內容的前提下，替腳註（編號）、交叉引用（目標的編號）與文獻引用（代號）加上顯示文字。
 * 顯示文字放在節點的 data 屬性，由 CSS 的 `::after` 呈現；內容改變或收到 REFS_CHANGED 時重算。
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
