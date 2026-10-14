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
import { Footnote } from "./nodes/footnote";
import { CjkBold, CjkItalic, CjkStrike } from "./marks";

/**
 * 編輯器的 schema：只包含 `@marktwain/schema` 認得的節點與標記（對等測試會驗證）。
 * 不含任何畫面相關的程式（NodeView、工具列），所以可以在沒有 DOM 的測試裡使用。
 */
export function createSchemaExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      // 換成輸入規則適用中文的版本（見 marks.ts）
      bold: false,
      italic: false,
      strike: false,
      // 我們的 schema 沒有底線；連結不自動偵測、不在點擊時開啟（離線編輯器）
      underline: false,
      link: { openOnClick: false, autolink: false, linkOnPaste: false },
    }),
    CjkBold,
    CjkItalic,
    CjkStrike,
    GlobalAttributes,
    Mathematics,
    Table.configure({ resizable: false }),
    TableRow,
    // 儲存格只有一個段落（管線表格沒有多段儲存格）
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
