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

  // 腳註的內容是行內 Markdown 原文（單一段落）；編號在序列化時依出現順序產生。
  [NodeName.Footnote]: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { text: { default: "" } },
  },

  // 文獻引用：keys 是書目的 key；form 是 paren、prose、year、author 其中之一（規格 4.3 節）。
  [NodeName.Citation]: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { keys: { default: [] }, form: { default: "paren" } },
  },

  // 交叉引用：label 是 cha、sec、fig、tbl、eq、lst 開頭的標籤。
  [NodeName.CrossRef]: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { label: { default: "" } },
  },

  // 圖：獨立成段的圖片。caption 是行內 Markdown 原文；width 例如 "60%"。
  [NodeName.Figure]: {
    group: "block",
    atom: true,
    attrs: {
      src: { default: "" },
      caption: { default: "" },
      label: { default: null },
      width: { default: null },
    },
  },

  // 並排圖（layout 為 row）或網格圖（grid）；子圖的 caption 是子標題，這裡的 caption 是總標題。
  [NodeName.FigureGroup]: {
    group: "block",
    content: "figure+",
    attrs: {
      label: { default: null },
      caption: { default: "" },
      layout: { default: "row" },
      columns: { default: null },
    },
  },

  // 一般的圍欄 div（摘要的 .abstract-zh 等）；不符合並排圖結構的 .figrow 也保持成 div。
  [NodeName.Div]: {
    group: "block",
    content: "block+",
    defining: true,
    attrs: { id: { default: null }, classes: { default: [] }, props: { default: {} } },
  },

  // 表格：名稱與 TipTap 的表格擴充一致。儲存格只有一個段落（管線表格沒有多段儲存格）；
  // align 是欄位對齊（left、center、right 或 null）。標題、標籤與附註在表格節點上。
  [NodeName.Table]: {
    group: "block",
    content: "tableRow+",
    isolating: true,
    attrs: { label: { default: null }, caption: { default: "" }, notes: { default: "" } },
  },

  [NodeName.TableRow]: { content: "(tableHeader | tableCell)+" },

  [NodeName.TableHeader]: {
    content: "paragraph",
    isolating: true,
    attrs: {
      align: { default: null },
      colspan: { default: 1 },
      rowspan: { default: 1 },
      colwidth: { default: null },
    },
  },

  [NodeName.TableCell]: {
    content: "paragraph",
    isolating: true,
    attrs: {
      align: { default: null },
      colspan: { default: 1 },
      rowspan: { default: 1 },
      colwidth: { default: null },
    },
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
