import { mergeAttributes, Node } from "@tiptap/core";

/** 交叉引用：label 是 cha、sec、fig、tbl、eq、lst 開頭的標籤。 */
export const CrossRef = Node.create({
  name: "crossRef",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return { label: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "span[data-cross-ref]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-cross-ref": "" })];
  },
});
