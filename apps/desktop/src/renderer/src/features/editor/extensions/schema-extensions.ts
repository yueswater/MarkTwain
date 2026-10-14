import type { Extensions } from "@tiptap/core";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { GlobalAttributes } from "./global-attributes";
import { Citation } from "./nodes/citation";
import { CrossRef } from "./nodes/cross-ref";
import { DefinitionDescription, DefinitionList, DefinitionTerm } from "./nodes/definition-list";
import { Div } from "./nodes/div";
import { FigureGroup } from "./nodes/figure-group";
import { Figure } from "./nodes/figure";
import { MathInputRules } from "./math-input";
import { TableExtras } from "./table-extras";
import { Footnote } from "./nodes/footnote";
import { CjkBold, CjkItalic, CjkStrike } from "./marks";

/**
 * Schema of the editor, only nodes and marks known to @marktwain/schema, checked by the parity test.
 * It holds no view code such as node views or toolbars, so it can run in tests without a DOM.
 */
export type SchemaExtensionOptions = {
  /** Called when a formula is clicked, the view layer uses it to open the edit dialog. Not needed in tests or pure schema use. */
  onMathClick?: (kind: "inline" | "block", latex: string, pos: number) => void;
};

export function createSchemaExtensions(options: SchemaExtensionOptions = {}): Extensions {
  const { onMathClick } = options;
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      // Replaced with versions whose input rules work for Chinese, see marks.ts
      bold: false,
      italic: false,
      strike: false,
      // Our schema has no underline, links are not detected automatically and do not open on click, since the editor is offline
      underline: false,
      link: { openOnClick: false, autolink: false, linkOnPaste: false },
    }),
    CjkBold,
    CjkItalic,
    CjkStrike,
    GlobalAttributes,
    Mathematics.configure({
      inlineOptions: onMathClick ? { onClick: (node, pos) => onMathClick("inline", node.attrs.latex, pos) } : undefined,
      blockOptions: onMathClick ? { onClick: (node, pos) => onMathClick("block", node.attrs.latex, pos) } : undefined,
    }),
    MathInputRules,
    // Columns can be dragged, TableExtras copies the widths into the document
    Table.configure({ resizable: true, allowTableNodeSelection: true }),
    TableExtras,
    TableRow,
    // A cell holds a single paragraph, pipe tables have no multi paragraph cells
    TableHeader.extend({ content: "paragraph" }),
    TableCell.extend({ content: "paragraph" }),
    Footnote,
    Citation,
    CrossRef,
    Figure,
    FigureGroup,
    Div,
    DefinitionList,
    DefinitionTerm,
    DefinitionDescription,
  ];
}
