import { mergeAttributes, Node } from "@tiptap/core";

/** 圖：獨立成段的圖片。caption 是行內 Markdown 原文；width 例如 "60%"。 */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
      caption: { default: "" },
      label: { default: null },
      width: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-figure]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-figure": "" })];
  },
});
