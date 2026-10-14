import { mergeAttributes, Node } from "@tiptap/core";

/** Cross-reference, label starts with cha, sec, fig, tbl, eq or lst. */
export const CrossRef = Node.create({
  name: "crossRef",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-label": String(attributes.label ?? "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-cross-ref]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-cross-ref": "" })];
  },
});
