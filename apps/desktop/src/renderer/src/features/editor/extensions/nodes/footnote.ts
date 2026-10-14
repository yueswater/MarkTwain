import { mergeAttributes, Node } from "@tiptap/core";

/** Footnote, the content is inline Markdown source and numbers are generated in order of appearance when serializing. */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      text: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-text") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-text": String(attributes.text ?? "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-footnote]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes, { "data-footnote": "" })];
  },
});
