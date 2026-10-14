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
