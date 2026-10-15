import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { StatementKind } from "@marktwain/schema";
import { findStatementHeads } from "../blocks/statement-heads";

export const STATEMENTS_CHANGED = "marktwain:statements-changed";
const key = new PluginKey("marktwainStatements");

export type StatementDecorationOptions = {
  /** How many blocks of each kind come before this document */
  getBase: () => Readonly<Record<string, number>>;
  nameOf: (kind: StatementKind) => string;
  getStyle: () => "callout" | "colored";
  /** Accent color of a kind, the default of the kind when the author chose none */
  colorOf: (kind: StatementKind) => string;
  /** Called with the position of a block when its head is clicked */
  onEdit: (pos: number) => void;
};

/**
 * Draws the head of a definition, lemma or theorem with its name, number and title, and its callout style, without
 * changing the document. Recomputed when the content changes or STATEMENTS_CHANGED arrives. Colors are for the editor only.
 */
export const StatementDecorations = Extension.create<StatementDecorationOptions>({
  name: "statementDecorations",

  addOptions() {
    return { getBase: () => ({}), nameOf: (kind) => kind.id, getStyle: () => "callout", colorOf: (kind) => kind.accent, onEdit: () => undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const style = options.getStyle();
            const decorations: Decoration[] = [];
            for (const head of findStatementHeads(state.doc, options.getBase(), options.nameOf)) {
              const accent = options.colorOf(head.kind);
              decorations.push(
                Decoration.node(head.pos, head.pos + head.size, {
                  "data-statement": head.kind.id,
                  "data-statement-style": style,
                  ...(style === "colored" ? { style: `--st-accent:${accent}` } : {}),
                }),
                Decoration.widget(
                  head.pos + 1,
                  () => {
                    const dom = document.createElement("div");
                    dom.className = "statement-head";
                    dom.contentEditable = "false";
                    dom.textContent = head.text;
                    dom.addEventListener("mousedown", (event) => {
                      event.preventDefault();
                      options.onEdit(head.pos);
                    });
                    return dom;
                  },
                  { side: -1, key: `${head.kind.id}:${head.text}:${head.pos}`, ignoreSelection: true },
                ),
              );
            }
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
