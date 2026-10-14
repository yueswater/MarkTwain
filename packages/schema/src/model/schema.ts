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

  // The content of a formula is LaTeX source and not Markdown, the name matches the official math extension of TipTap.
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

  // Footnote, content is inline Markdown source in a single paragraph, numbers are generated in order of appearance when serializing.
  [NodeName.Footnote]: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { text: { default: "" } },
  },

  // Citation, keys are bibliography keys and form is one of paren, prose, year and author, see section 4.3 of the spec.
  [NodeName.Citation]: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { keys: { default: [] }, form: { default: "paren" } },
  },

  // Cross-reference, label starts with cha, sec, fig, tbl, eq or lst.
  [NodeName.CrossRef]: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { label: { default: "" } },
  },

  // Figure, an image in its own paragraph. Caption is inline Markdown source and width is for example "60%".
  [NodeName.Figure]: {
    group: "block",
    atom: true,
    attrs: {
      src: { default: "" },
      caption: { default: "" },
      label: { default: null },
      width: { default: null },
      // Where it floats, one of the placements, null follows the thesis
      placement: { default: null },
    },
  },

  // Side by side figures, layout row, or a grid. A caption of a sub figure is its sub title and the caption here is the overall title.
  [NodeName.FigureGroup]: {
    group: "block",
    content: "figure+",
    attrs: {
      label: { default: null },
      caption: { default: "" },
      layout: { default: "row" },
      columns: { default: null },
      placement: { default: null },
    },
  },

  // Plain fenced div such as .abstract-zh of an abstract. A .figrow that does not fit the figure group structure also stays a div.
  [NodeName.Div]: {
    group: "block",
    content: "block+",
    defining: true,
    attrs: { id: { default: null }, classes: { default: [] }, props: { default: {} } },
  },

  // Table, names match the table extension of TipTap. A cell holds a single paragraph, pipe tables have no multi paragraph cells.
  // align is the column alignment, left, center, right or null. Caption, label and notes are on the table node.
  [NodeName.Table]: {
    group: "block",
    content: "tableRow+",
    isolating: true,
    attrs: {
      label: { default: null },
      caption: { default: "" },
      notes: { default: "" },
      // three-line or grid
      style: { default: "three-line" },
      // Column widths such as "20%,30%,50%", an empty string means automatic
      widths: { default: "" },
      placement: { default: null },
    },
  },

  // height is a length such as 30pt or 2em, null means automatic.
  // A row can be empty when every cell of it is merged from the rows above.
  [NodeName.TableRow]: { content: "(tableHeader | tableCell)*", attrs: { height: { default: null } } },

  [NodeName.TableHeader]: {
    content: "paragraph",
    isolating: true,
    attrs: {
      align: { default: null },
      // top, middle or bottom, null means the default of the template
      valign: { default: null },
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
      // top, middle or bottom, null means the default of the template
      valign: { default: null },
      colspan: { default: 1 },
      rowspan: { default: 1 },
      colwidth: { default: null },
    },
  },

  // Definition list for the notation page, each term has one or more descriptions.
  [NodeName.DefinitionList]: { group: "block", content: "(definitionTerm definitionDescription+)+" },
  [NodeName.DefinitionTerm]: { content: "inline*" },
  [NodeName.DefinitionDescription]: { content: "block+" },
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
