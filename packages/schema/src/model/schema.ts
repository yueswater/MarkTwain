import { Schema, type MarkSpec, type NodeSpec } from "prosemirror-model";
import { MarkName, NodeName } from "./names";

const nodes: Record<NodeName, NodeSpec> = {
  [NodeName.Doc]: { content: "block+" },

  [NodeName.Paragraph]: { content: "inline*", group: "block" },

  [NodeName.Heading]: {
    attrs: { level: { default: 1 }, label: { default: null } },
    content: "inline*",
    group: "block",
    defining: true,
  },

  [NodeName.Blockquote]: { content: "block+", group: "block", defining: true },

  [NodeName.BulletList]: { content: "listItem+", group: "block" },

  [NodeName.OrderedList]: {
    attrs: { start: { default: 1 } },
    content: "listItem+",
    group: "block",
  },

  [NodeName.ListItem]: { content: "paragraph block*", defining: true },

  [NodeName.CodeBlock]: {
    attrs: { language: { default: null }, label: { default: null }, caption: { default: null } },
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
  },

  [NodeName.HorizontalRule]: { group: "block" },

  [NodeName.Text]: { group: "inline" },

  [NodeName.HardBreak]: { inline: true, group: "inline", selectable: false },

  // 公式的內容是 LaTeX 原文，不是 Markdown；名稱與 TipTap 官方的數學擴充一致。
  [NodeName.InlineMath]: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { latex: { default: "" } },
  },

  [NodeName.BlockMath]: {
    group: "block",
    atom: true,
    attrs: { latex: { default: "" }, label: { default: null } },
  },
};

const marks: Record<MarkName, MarkSpec> = {
  [MarkName.Link]: {
    attrs: { href: {}, title: { default: null } },
    inclusive: false,
  },
  [MarkName.Italic]: {},
  [MarkName.Bold]: {},
  [MarkName.Strike]: {},
  [MarkName.Code]: { excludes: "_" },
};

export const schema = new Schema({ nodes, marks });
