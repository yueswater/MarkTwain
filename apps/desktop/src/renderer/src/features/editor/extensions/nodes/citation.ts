import { mergeAttributes, Node } from "@tiptap/core";

/** 文獻引用：keys 是書目的 key；form 是 paren、prose、year、author 其中之一。 */
export const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      keys: { default: [] },
      form: { default: "paren" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-citation]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-citation": "" })];
  },
});
