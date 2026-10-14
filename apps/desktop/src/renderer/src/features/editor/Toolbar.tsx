import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import {
  AsteriskIcon,
  BoldIcon,
  BookMarkedIcon,
  BookAIcon,
  CodeIcon,
  FileCodeIcon,
  ImageIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  RadicalIcon,
  SigmaIcon,
  Redo2Icon,
  StrikethroughIcon,
  TableIcon,
  TypeIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TableTools } from "./TableTools";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  editor: Editor;
  onInsertMath: (kind: "inline" | "block") => void;
  onInsertAtom: (type: "footnote" | "citation" | "crossRef") => void;
  onEditCaption: () => void;
  onInsertImage: () => void;
};

const BLOCKS = ["paragraph", "heading1", "heading2", "heading3", "heading4"] as const;
type Block = (typeof BLOCKS)[number];

function currentBlock(editor: Editor): Block {
  for (let level = 1; level <= 4; level++) {
    if (editor.isActive("heading", { level })) return `heading${level}` as Block;
  }
  return "paragraph";
}

function setBlock(editor: Editor, block: Block): void {
  const chain = editor.chain().focus();
  if (block === "paragraph") chain.setParagraph().run();
  else chain.setHeading({ level: Number(block.slice(-1)) as 1 | 2 | 3 | 4 }).run();
}

/** 在游標所在的清單後面接一組新的「詞條＋說明」；不在定義清單裡時插入新的清單，游標落在詞條裡。 */
function insertDefinition(editor: Editor, inList: boolean): void {
  const { schema } = editor.state;
  const term = schema.nodes.definitionTerm;
  const description = schema.nodes.definitionDescription;
  const list = schema.nodes.definitionList;
  const paragraph = schema.nodes.paragraph;
  if (!term || !description || !list || !paragraph) return;
  const pair = [term.create(), description.create(null, paragraph.create())];

  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const { $from } = state.selection;
      if (inList) {
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type === list) {
            const end = $from.end(depth);
            tr.insert(end, pair);
            tr.setSelection(TextSelection.create(tr.doc, end + 1)); // 新詞條的內容開頭
            return true;
          }
        }
        return false;
      }
      // 游標在空段落時取代它，否則插在目前區塊之後
      const emptyParagraph = $from.parent.type === paragraph && $from.parent.content.size === 0;
      const at = emptyParagraph ? $from.before() : $from.after();
      if (emptyParagraph) tr.replaceWith(at, $from.after(), list.create(null, pair));
      else tr.insert(at, list.create(null, pair));
      tr.setSelection(TextSelection.create(tr.doc, at + 2)); // list 開頭 +1、term 開頭 +1
      return true;
    })
    .run();
}

export function Toolbar({ editor, onInsertMath, onInsertAtom, onEditCaption, onInsertImage }: Props) {
  const { t } = useTranslation("editor");

  // 選取範圍或內容改變時重新計算按鈕狀態
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: currentBlock(e),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      inTable: e.isActive("table"),
      inDefinitionList: e.isActive("definitionList"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const button = (
    label: string,
    Icon: LucideIcon,
    onClick: () => void,
    options: { active?: boolean; disabled?: boolean } = {},
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={options.active}
      disabled={options.disabled}
      className={cn(options.active && "bg-muted")}
      // 按鈕不搶走編輯器的焦點與選取範圍
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </Button>
  );

  return (
    <>
    <div
      role="toolbar"
      aria-label={t("toolbar.label")}
      className="flex shrink-0 flex-wrap items-center gap-0.5 border-b px-3 py-1.5"
    >
      {button(t("toolbar.undo"), Undo2Icon, () => editor.chain().focus().undo().run(), {
        disabled: !state.canUndo,
      })}
      {button(t("toolbar.redo"), Redo2Icon, () => editor.chain().focus().redo().run(), {
        disabled: !state.canRedo,
      })}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Select value={state.block} onValueChange={(value) => setBlock(editor, value as Block)}>
        <SelectTrigger size="sm" aria-label={t("toolbar.block")} className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BLOCKS.map((block) => (
            <SelectItem key={block} value={block}>
              {t(`toolbar.${block}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("toolbar.bold"), BoldIcon, () => editor.chain().focus().toggleBold().run(), {
        active: state.bold,
      })}
      {button(t("toolbar.italic"), ItalicIcon, () => editor.chain().focus().toggleItalic().run(), {
        active: state.italic,
      })}
      {button(
        t("toolbar.strike"),
        StrikethroughIcon,
        () => editor.chain().focus().toggleStrike().run(),
        { active: state.strike },
      )}
      {button(t("toolbar.code"), CodeIcon, () => editor.chain().focus().toggleCode().run(), {
        active: state.code,
      })}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(
        t("toolbar.bulletList"),
        ListIcon,
        () => editor.chain().focus().toggleBulletList().run(),
        { active: state.bulletList },
      )}
      {button(
        t("toolbar.orderedList"),
        ListOrderedIcon,
        () => editor.chain().focus().toggleOrderedList().run(),
        { active: state.orderedList },
      )}
      {button(
        t("toolbar.blockquote"),
        QuoteIcon,
        () => editor.chain().focus().toggleBlockquote().run(),
        { active: state.blockquote },
      )}
      {button(
        t("toolbar.codeBlock"),
        FileCodeIcon,
        () => editor.chain().focus().toggleCodeBlock().run(),
        { active: state.codeBlock },
      )}
      {state.codeBlock && button(t("caption.codeTitle"), TypeIcon, onEditCaption)}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("toolbar.inlineMath"), SigmaIcon, () => onInsertMath("inline"))}
      {button(t("toolbar.blockMath"), RadicalIcon, () => onInsertMath("block"))}
      {button(t("toolbar.footnote"), AsteriskIcon, () => onInsertAtom("footnote"))}
      {button(t("toolbar.citation"), BookMarkedIcon, () => onInsertAtom("citation"))}
      {button(t("toolbar.crossRef"), Link2Icon, () => onInsertAtom("crossRef"))}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("toolbar.rule"), MinusIcon, () => editor.chain().focus().setHorizontalRule().run())}
      {button(t("toolbar.image"), ImageIcon, onInsertImage)}
      {button(t("toolbar.table"), TableIcon, () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      )}
      {button(t("toolbar.definitionList"), BookAIcon, () => insertDefinition(editor, state.inDefinitionList))}
    </div>
    {state.inTable && <TableTools editor={editor} onEditCaption={onEditCaption} />}
    </>
  );
}
