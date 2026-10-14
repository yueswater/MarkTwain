import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  BoldIcon,
  CodeIcon,
  FileCodeIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  RadicalIcon,
  SigmaIcon,
  Redo2Icon,
  StrikethroughIcon,
  TableIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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

export function Toolbar({ editor, onInsertMath }: Props) {
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
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("toolbar.inlineMath"), SigmaIcon, () => onInsertMath("inline"))}
      {button(t("toolbar.blockMath"), RadicalIcon, () => onInsertMath("block"))}
      {button(t("toolbar.rule"), MinusIcon, () => editor.chain().focus().setHorizontalRule().run())}
      {button(t("toolbar.table"), TableIcon, () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      )}
    </div>
  );
}
