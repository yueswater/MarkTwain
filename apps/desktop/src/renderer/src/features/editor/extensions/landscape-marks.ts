import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type LandscapeOptions = {
  /** The words on the head of the block */
  label: () => string;
  /** The words on the head of a part of the abstract */
  abstractLabel: (kind: "abstract-zh" | "abstract-en") => string;
  /** The words of the button that takes a part of the abstract away */
  abstractRemoveLabel: () => string;
  /** The words of the button that takes the block away */
  removeLabel: () => string;
  /** Called with the position of a block whose button was pressed */
  onRemove: (pos: number) => void;
};

const ABSTRACT_KINDS = ["abstract-zh", "abstract-en"] as const;

/** Draws a frame with a head around the blocks that are printed on a page turned sideways, and around the parts of the abstract. The document is not changed. */
export const LandscapeMarks = Extension.create<LandscapeOptions>({
  name: "landscapeMarks",

  addOptions() {
    return { label: () => "", abstractLabel: () => "", abstractRemoveLabel: () => "", removeLabel: () => "", onRemove: () => undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "div" || !Array.isArray(node.attrs.classes)) return true;
              const classes = node.attrs.classes as string[];
              const abstract = ABSTRACT_KINDS.find((kind) => classes.includes(kind));
              if (!classes.includes("landscape") && !abstract) return true;
              const text = abstract ? options.abstractLabel(abstract) : options.label();
              const removeText = abstract ? options.abstractRemoveLabel() : options.removeLabel();
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, abstract ? { "data-abstract": abstract } : { "data-landscape": "" }),
                Decoration.widget(
                  pos + 1,
                  () => {
                    const head = document.createElement("div");
                    head.className = "landscape-head";
                    head.contentEditable = "false";
                    const label = document.createElement("span");
                    label.textContent = text;
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = "×";
                    button.title = removeText;
                    button.setAttribute("aria-label", removeText);
                    button.addEventListener("mousedown", (event) => {
                      event.preventDefault();
                      options.onRemove(pos);
                    });
                    head.append(label, button);
                    return head;
                  },
                  { side: -1, key: `frame:${text}:${pos}`, ignoreSelection: true },
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
