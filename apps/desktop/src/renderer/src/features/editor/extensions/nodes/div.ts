import { mergeAttributes, Node } from "@tiptap/core";

/** Plain fenced div, for example .abstract-zh of an abstract. */
export const Div = Node.create({
  name: "div",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      id: { default: null },
      classes: { default: [] },
      props: { default: {} },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-div]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-div": "" }), 0];
  },
});
