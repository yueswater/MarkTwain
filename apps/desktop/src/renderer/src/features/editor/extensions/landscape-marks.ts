import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type LandscapeOptions = {
  /** The words on the head of the block */
  label: () => string;
  /** The words of the button that takes the block away */
  removeLabel: () => string;
  /** Called with the position of a block whose button was pressed */
  onRemove: (pos: number) => void;
};

/** Draws a frame with a head around the blocks that are printed on a page turned sideways. The document is not changed. */
export const LandscapeMarks = Extension.create<LandscapeOptions>({
  name: "landscapeMarks",

  addOptions() {
    return { label: () => "", removeLabel: () => "", onRemove: () => undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "div" || !Array.isArray(node.attrs.classes) || !node.attrs.classes.includes("landscape")) return true;
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, { "data-landscape": "" }),
                Decoration.widget(
                  pos + 1,
                  () => {
                    const head = document.createElement("div");
                    head.className = "landscape-head";
                    head.contentEditable = "false";
                    const text = document.createElement("span");
                    text.textContent = options.label();
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = "×";
                    button.title = options.removeLabel();
                    button.setAttribute("aria-label", options.removeLabel());
                    button.addEventListener("mousedown", (event) => {
                      event.preventDefault();
                      options.onRemove(pos);
                    });
                    head.append(text, button);
                    return head;
                  },
                  { side: -1, key: `landscape:${options.label()}:${pos}`, ignoreSelection: true },
                ),
              );
              return true;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
