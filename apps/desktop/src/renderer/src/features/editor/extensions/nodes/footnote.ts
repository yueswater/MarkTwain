import { mergeAttributes, Node } from "@tiptap/core";

/** 腳註：內容是行內 Markdown 原文；編號在序列化時依出現順序產生。 */
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
