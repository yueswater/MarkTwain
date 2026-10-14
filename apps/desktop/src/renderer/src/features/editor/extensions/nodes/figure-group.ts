import { mergeAttributes, Node } from "@tiptap/core";

/** 並排圖（layout 為 row）或網格圖（grid）；子圖的 caption 是子標題，這裡的 caption 是總標題。 */
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
    };
  },

  parseHTML() {
    return [{ tag: "div[data-figure-group]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-figure-group": "" }), 0];
  },
});
