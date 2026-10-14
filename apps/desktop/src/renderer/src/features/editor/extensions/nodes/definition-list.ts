import { Node } from "@tiptap/core";

/** Definition list for the notation page, each term has one or more descriptions. */
export const DefinitionList = Node.create({
  name: "definitionList",
  group: "block",
  content: "(definitionTerm definitionDescription+)+",

  parseHTML() {
    return [{ tag: "dl" }];
  },

  renderHTML() {
    return ["dl", 0];
  },
});

export const DefinitionTerm = Node.create({
  name: "definitionTerm",
  content: "inline*",

  addKeyboardShortcuts() {
    return {
      // A term cannot split into two terms since the structure is term plus description, so Enter jumps to its description
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== this.name) return false;
        return editor.commands.setTextSelection($from.after() + 2);
      },
    };
  },

  parseHTML() {
    return [{ tag: "dt" }];
  },

  renderHTML() {
    return ["dt", 0];
  },
});

export const DefinitionDescription = Node.create({
  name: "definitionDescription",
  content: "block+",

  parseHTML() {
    return [{ tag: "dd" }];
  },

  renderHTML() {
    return ["dd", 0];
  },
});
