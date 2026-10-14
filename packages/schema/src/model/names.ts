/**
 * 節點與標記的名稱。與 TipTap 的 StarterKit 一致（camelCase），
 * 所以編輯器的 JSON 可以直接交給 `serialize`。
 */
export const NodeName = {
  Doc: "doc",
  Paragraph: "paragraph",
  Heading: "heading",
  Blockquote: "blockquote",
  BulletList: "bulletList",
  OrderedList: "orderedList",
  ListItem: "listItem",
  CodeBlock: "codeBlock",
  HorizontalRule: "horizontalRule",
  Text: "text",
  HardBreak: "hardBreak",
  InlineMath: "inlineMath",
  BlockMath: "blockMath",
  Footnote: "footnote",
  Citation: "citation",
  CrossRef: "crossRef",
  Figure: "figure",
  FigureGroup: "figureGroup",
  Div: "div",
} as const;

export type NodeName = (typeof NodeName)[keyof typeof NodeName];

export const MarkName = {
  Bold: "bold",
  Italic: "italic",
  Strike: "strike",
  Code: "code",
  Link: "link",
} as const;

export type MarkName = (typeof MarkName)[keyof typeof MarkName];
