import { mergeAttributes, Node } from "@tiptap/core";

/** 一般的圍欄 div（摘要的 .abstract-zh 等）。 */
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
