import { Node } from "@tiptap/core";

/** 定義清單（符號說明頁）：每個詞有一個以上的說明。 */
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
      // 詞條不能分成兩個詞條（結構是「詞條加說明」），Enter 改為跳到它的說明
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
