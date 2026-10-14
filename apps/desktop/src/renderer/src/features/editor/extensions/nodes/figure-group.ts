import { mergeAttributes, Node } from "@tiptap/core";

/** Side by side figures, layout row, or a grid. A caption of a sub figure is its sub title and the caption here is the overall title. */
export const FigureGroup = Node.create({
  name: "figureGroup",
  group: "block",
  content: "figure+",

  addAttributes() {
    return {
      label: { default: null },
      caption: { default: "" },
      layout: { default: "row" },
      columns: { default: null },
      placement: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-figure-group]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-figure-group": "" }), 0];
  },
});
