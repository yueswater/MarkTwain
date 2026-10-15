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
  VariableIcon,
  SigmaIcon,
  Redo2Icon,
  StrikethroughIcon,
  TableIcon,
  TypeIcon,
  Undo2Icon,
  type LucideIcon,
  SquareSigmaIcon,
} from "lucide-react";
import { STATEMENT_KINDS } from "@marktwain/schema";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePrefs } from "@/lib/prefs";
import { headingName } from "./heading-names";
import { insertStatement } from "./statement-commands";
import { statementIcon } from "./statement-icons";
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
  onInsertTable: () => void;
};

const BLOCKS = ["paragraph", "heading2", "heading3", "heading4"] as const;
type Block = (typeof BLOCKS)[number] | "heading1";

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

/** Appends a new term and description after the list at the cursor, or inserts a new list when not in one, with the cursor in the term. */
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
            tr.setSelection(TextSelection.create(tr.doc, end + 1)); // Start of the content of the new term
            return true;
          }
        }
        return false;
      }
      // Replace an empty paragraph at the cursor, otherwise insert after the current block
      const emptyParagraph = $from.parent.type === paragraph && $from.parent.content.size === 0;
      const at = emptyParagraph ? $from.before() : $from.after();
      if (emptyParagraph) tr.replaceWith(at, $from.after(), list.create(null, pair));
      else tr.insert(at, list.create(null, pair));
      tr.setSelection(TextSelection.create(tr.doc, at + 2)); // list start plus 1 and term start plus 1
      return true;
    })
    .run();
}

export function Toolbar({ editor, onInsertMath, onInsertAtom, onEditCaption, onInsertImage, onInsertTable }: Props) {
  const { t } = useTranslation("editor");
  const { prefs } = usePrefs();
  const blockName = (block: string) => (block.startsWith("heading") && block !== "heading1" ? headingName(Number(block.slice(-1)) as 2 | 3 | 4, prefs.headingNames, t(`toolbar.${block}`)) : t(`toolbar.${block}`));

  // Recompute button state when the selection or content changes
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
      // Buttons do not take focus or selection from the editor
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
      className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <SelectContent onCloseAutoFocus={(event) => { event.preventDefault(); editor.commands.focus(); }}>
          {/* The chapter title is not chosen here, it is listed only while the cursor is in one */}
          {state.block === "heading1" && <SelectItem value="heading1">{t("toolbar.heading1")}</SelectItem>}
          {BLOCKS.map((block) => (
            <SelectItem key={block} value={block}>
              {blockName(block)}
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
      {state.codeBlock && (
        <>
          {button(t("caption.codeTitle"), TypeIcon, onEditCaption)}
        </>
      )}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("toolbar.inlineMath"), VariableIcon, () => onInsertMath("inline"))}
      {button(t("toolbar.blockMath"), SigmaIcon, () => onInsertMath("block"))}
      {button(t("toolbar.footnote"), AsteriskIcon, () => onInsertAtom("footnote"))}
      {button(t("toolbar.citation"), BookMarkedIcon, () => onInsertAtom("citation"))}
      {button(t("toolbar.crossRef"), Link2Icon, () => onInsertAtom("crossRef"))}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("toolbar.rule"), MinusIcon, () => editor.chain().focus().setHorizontalRule().run())}
      {button(t("toolbar.image"), ImageIcon, onInsertImage)}
      {button(t("toolbar.table"), TableIcon, onInsertTable)}
      {button(t("toolbar.definitionList"), BookAIcon, () => insertDefinition(editor, state.inDefinitionList))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("toolbar.statement")} title={t("toolbar.statement")} onMouseDown={(event) => event.preventDefault()}>
            <SquareSigmaIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(event) => { event.preventDefault(); editor.commands.focus(); }}>
          {STATEMENT_KINDS.map((kind) => (
            <DropdownMenuItem key={kind.id} onSelect={() => insertStatement(editor, kind.id)}>
              {(() => {
                const Icon = statementIcon(kind.id);
                return <Icon aria-hidden="true" />;
              })()}
              {t(`statement.kinds.${kind.id}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {state.inTable && <TableTools editor={editor} onEditCaption={onEditCaption} />}
    </>
  );
}
