import type { Editor, Range } from "@tiptap/core";
import {
  AsteriskIcon,
  BookMarkedIcon,
  FileCodeIcon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  RectangleHorizontalIcon,
  SigmaIcon,
  TableIcon,
  TypeIcon,
  VariableIcon,
  type LucideIcon,
} from "lucide-react";
import { STATEMENT_KINDS } from "@marktwain/schema";
import { insertLandscape, insertStatement } from "../blocks/statement-commands";
import { statementIcon } from "../blocks/statement-icons";

/** What the menu asks the editor view to do, the same functions the toolbar uses. */
export type SlashHandlers = {
  insertMath: (kind: "inline" | "block") => void;
  insertAtom: (type: "footnote" | "citation" | "crossRef") => void;
  insertImage: () => void;
  insertTable: () => void;
  insertLandscape: () => void;
};

export type SlashGroup = "basic" | "thesis" | "statement";

export type SlashItem = {
  id: string;
  group: SlashGroup;
  icon: LucideIcon;
  /** Words besides the name that find the item, in both languages */
  aliases: readonly string[];
  /** What a person can type in the text to get the same block, shown at the right of the name */
  markdown?: string;
  /** The kind of drawing in the panel at the right, none means a text only */
  preview: "text" | "heading" | "bullet" | "ordered" | "quote" | "rule" | "code" | "display" | "inline" | "figure" | "table" | "footnote" | "citation" | "crossRef" | "landscape";
  run: (editor: Editor, range: Range, handlers: SlashHandlers) => void;
};

/** Takes the typed slash and its text away, then runs the command at the place where they were. */
const here = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

const BASE_ITEMS: readonly SlashItem[] = [
  { id: "text", group: "basic", icon: TypeIcon, aliases: ["paragraph", "text", "文字", "段落", "內文"], preview: "text", run: (e, r) => here(e, r).setParagraph().run() },
  { id: "heading2", group: "basic", icon: Heading2Icon, aliases: ["h2", "heading", "section", "標題", "節"], markdown: "##", preview: "heading", run: (e, r) => here(e, r).setHeading({ level: 2 }).run() },
  { id: "heading3", group: "basic", icon: Heading3Icon, aliases: ["h3", "heading", "subsection", "標題", "小節"], markdown: "###", preview: "heading", run: (e, r) => here(e, r).setHeading({ level: 3 }).run() },
  { id: "heading4", group: "basic", icon: Heading4Icon, aliases: ["h4", "heading", "標題"], markdown: "####", preview: "heading", run: (e, r) => here(e, r).setHeading({ level: 4 }).run() },
  { id: "bulletList", group: "basic", icon: ListIcon, aliases: ["bullet", "list", "ul", "清單", "項目", "列點"], markdown: "-", preview: "bullet", run: (e, r) => here(e, r).toggleBulletList().run() },
  { id: "orderedList", group: "basic", icon: ListOrderedIcon, aliases: ["number", "ordered", "list", "ol", "編號", "清單", "列點"], markdown: "1.", preview: "ordered", run: (e, r) => here(e, r).toggleOrderedList().run() },
  { id: "quote", group: "basic", icon: QuoteIcon, aliases: ["quote", "blockquote", "引用", "引文"], markdown: ">", preview: "quote", run: (e, r) => here(e, r).toggleBlockquote().run() },
  { id: "rule", group: "basic", icon: MinusIcon, aliases: ["divider", "rule", "hr", "分隔", "分隔線"], markdown: "---", preview: "rule", run: (e, r) => here(e, r).setHorizontalRule().run() },
  { id: "displayMath", group: "thesis", icon: SigmaIcon, aliases: ["formula", "equation", "math", "tex", "latex", "公式", "方程式", "獨立"], markdown: "$$", preview: "display", run: (e, r, h) => { here(e, r).run(); h.insertMath("block"); } },
  { id: "inlineMath", group: "thesis", icon: VariableIcon, aliases: ["formula", "inline", "math", "tex", "latex", "公式", "行內"], markdown: "$", preview: "inline", run: (e, r, h) => { here(e, r).run(); h.insertMath("inline"); } },
  { id: "figure", group: "thesis", icon: ImageIcon, aliases: ["image", "picture", "figure", "photo", "圖", "圖片", "插圖"], preview: "figure", run: (e, r, h) => { here(e, r).run(); h.insertImage(); } },
  { id: "table", group: "thesis", icon: TableIcon, aliases: ["table", "grid", "表", "表格"], preview: "table", run: (e, r, h) => { here(e, r).run(); h.insertTable(); } },
  { id: "codeBlock", group: "thesis", icon: FileCodeIcon, aliases: ["code", "snippet", "程式", "程式碼"], markdown: "```", preview: "code", run: (e, r) => here(e, r).toggleCodeBlock().run() },
  { id: "landscape", group: "thesis", icon: RectangleHorizontalIcon, aliases: ["landscape", "wide", "sideways", "橫向", "橫式", "寬表", "轉向"], markdown: "::: landscape", preview: "landscape", run: (e, r) => { here(e, r).run(); insertLandscape(e); } },
  { id: "footnote", group: "thesis", icon: AsteriskIcon, aliases: ["footnote", "note", "腳註", "註腳", "註解"], preview: "footnote", run: (e, r, h) => { here(e, r).run(); h.insertAtom("footnote"); } },
  { id: "citation", group: "thesis", icon: BookMarkedIcon, aliases: ["citation", "cite", "reference", "bibliography", "引用文獻", "文獻", "參考"], preview: "citation", run: (e, r, h) => { here(e, r).run(); h.insertAtom("citation"); } },
  { id: "crossRef", group: "thesis", icon: LinkIcon, aliases: ["cross", "reference", "ref", "link", "交叉引用", "引用", "參照"], preview: "crossRef", run: (e, r, h) => { here(e, r).run(); h.insertAtom("crossRef"); } },
];

/** One item for each kind of block of a mathematical thesis, definition, lemma, theorem and so on. */
const STATEMENT_ITEMS: readonly SlashItem[] = STATEMENT_KINDS.map((kind) => ({
  id: `statement_${kind.id}`,
  group: "statement" as const,
  icon: statementIcon(kind.id),
  aliases: [kind.id, kind.name.zh, kind.name.en.toLowerCase(), "theorem", "定理", "數學"],
  markdown: `::: ${kind.id}`,
  preview: "text" as const,
  run: (e: Editor, r: Range) => {
    here(e, r).run();
    insertStatement(e, kind.id);
  },
}));

export const SLASH_ITEMS: readonly SlashItem[] = [...BASE_ITEMS, ...STATEMENT_ITEMS];

export const SLASH_GROUPS: readonly SlashGroup[] = ["basic", "thesis", "statement"];

