import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { SlashMenu, type SlashMenuHandle } from "./SlashMenu";
import { SLASH_ITEMS, type SlashHandlers, type SlashItem } from "./slash-items";
import { matchSlash, slashMayOpen } from "./slash-match";

type Options = {
  handlers: () => SlashHandlers;
  nameOf: (item: SlashItem) => string;
};

/** Typing a slash opens a list of blocks to insert, with a description or a drawing of the chosen one. */
export const SlashCommand = Extension.create<Options>({
  name: "slashCommand",

  addOptions() {
    return {
      handlers: () => ({ insertMath: () => undefined, insertAtom: () => undefined, insertImage: () => undefined, insertTable: () => undefined }),
      nameOf: (item) => item.id,
    };
  },

  addProseMirrorPlugins() {
    const { handlers, nameOf } = this.options;
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        allow: ({ state, range, editor }) => {
          const $from = state.doc.resolve(range.from);
          // A slash is plain text in code, in a formula and in a table cell
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const name = $from.node(depth).type.name;
            if (name === "codeBlock" || name === "tableCell" || name === "tableHeader") return false;
          }
          return slashMayOpen(state.doc.textBetween($from.start(), range.from, "\n", "\n"), editor.view.composing);
        },
        items: ({ query }) => matchSlash(query, SLASH_ITEMS, nameOf),
        command: ({ editor, range, props }) => props.run(editor, range, handlers()),
        render: () => {
          let component: ReactRenderer<SlashMenuHandle> | null = null;
          const props = (p: { items: SlashItem[]; query: string; clientRect?: (() => DOMRect | null) | null; command: (item: SlashItem) => void }) => ({
            items: p.items,
            query: p.query,
            rect: p.clientRect?.() ?? null,
            onPick: p.command,
          });
          return {
            onStart: (p) => {
              component = new ReactRenderer(SlashMenu, { props: props(p), editor: p.editor });
              document.body.appendChild(component.element);
            },
            onUpdate: (p) => component?.updateProps(props(p)),
            onKeyDown: (p) => {
              if (p.event.key === "Escape") {
                component?.destroy();
                component = null;
                return true;
              }
              return component?.ref?.onKeyDown(p.event) ?? false;
            },
            onExit: () => {
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
