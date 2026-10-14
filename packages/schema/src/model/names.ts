/**
 * Names of nodes and marks. Same as StarterKit of TipTap, in camelCase,
 * so the JSON of the editor can go straight to serialize.
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
  Table: "table",
  TableRow: "tableRow",
  TableHeader: "tableHeader",
  TableCell: "tableCell",
  DefinitionList: "definitionList",
  DefinitionTerm: "definitionTerm",
  DefinitionDescription: "definitionDescription",
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
