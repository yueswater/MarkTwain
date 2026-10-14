import { mergeAttributes, Node } from "@tiptap/core";

/** Citation, keys are bibliography keys and form is one of paren, prose, year and author. */
export const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      keys: {
        default: [],
        // Restore an array on copy and paste, bibliography keys contain no commas
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
