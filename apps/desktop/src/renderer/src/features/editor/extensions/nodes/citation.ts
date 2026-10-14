import { mergeAttributes, Node } from "@tiptap/core";

/** 文獻引用：keys 是書目的 key；form 是 paren、prose、year、author 其中之一。 */
export const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      keys: {
        default: [],
        // 複製貼上時要還原成陣列；書目 key 不含逗號
        parseHTML: (element: HTMLElement) =>
          (element.getAttribute("data-keys") ?? "").split(",").filter(Boolean),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-keys": ((attributes.keys as string[] | undefined) ?? []).join(","),
        }),
      },
      form: {
        default: "paren",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-form") ?? "paren",
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-form": String(attributes.form) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-citation]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-citation": "" })];
  },
});
