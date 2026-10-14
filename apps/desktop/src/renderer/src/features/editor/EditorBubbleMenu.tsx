import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  CodeIcon,
  ColumnsIcon,
  ItalicIcon,
  RowsIcon,
  SigmaIcon,
  StrikethroughIcon,
  TableCellsMergeIcon,
  TableCellsSplitIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { setColumnAlign } from "./table-commands";

type ItemProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  /** Shows the text next to the icon, used to suggest the next step */
  text?: string;
};

function Item({ icon: Icon, label, onClick, active, disabled, destructive, text }: ItemProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // The menu must not take focus from the editor, or the selection would be lost
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded px-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35",
        !text && "w-7 px-0",
        active && "bg-accent text-foreground",
        text && "bg-foreground text-background hover:bg-foreground/90 hover:text-background",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {text}
    </button>
  );
}

const divider = <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
const MENU_CLASS =
  "z-20 flex max-w-[min(94vw,40rem)] items-center gap-0.5 overflow-x-auto rounded-lg border bg-popover p-1 shadow-md";

type Props = { editor: Editor; onInsertMath: () => void };

/**
 * Floating tools next to the selection. Selected text offers the marks,
 * and selected table cells suggest merging and offer alignment.
 */
export function EditorBubbleMenu({ editor, onInsertMath }: Props) {
  const { t } = useTranslation("editor");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const selection = e.state.selection;
      return {
        cells: selection instanceof CellSelection,
        text: !(selection instanceof CellSelection) && !selection.empty && selection.$from.parent.isTextblock && !e.isActive("codeBlock"),
        canMerge: e.can().mergeCells(),
        canSplit: e.can().splitCell(),
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
      };
    },
  });
  const run = (fn: () => void) => () => {
    fn();
    editor.view.focus();
  };

  return (
    <>
      <BubbleMenu editor={editor} className={MENU_CLASS} shouldShow={() => state.text} aria-label={t("bubble.label")}>
        <Item icon={BoldIcon} label={t("toolbar.bold")} active={state.bold} onClick={run(() => editor.chain().toggleBold().run())} />
        <Item icon={ItalicIcon} label={t("toolbar.italic")} active={state.italic} onClick={run(() => editor.chain().toggleItalic().run())} />
        <Item icon={StrikethroughIcon} label={t("toolbar.strike")} active={state.strike} onClick={run(() => editor.chain().toggleStrike().run())} />
        <Item icon={CodeIcon} label={t("toolbar.code")} active={state.code} onClick={run(() => editor.chain().toggleCode().run())} />
        {divider}
        <Item icon={SigmaIcon} label={t("toolbar.inlineMath")} onClick={onInsertMath} />
      </BubbleMenu>

      <BubbleMenu editor={editor} className={MENU_CLASS} shouldShow={() => state.cells} aria-label={t("bubble.label")}>
        {state.canMerge && (
          <>
            <Item
              icon={TableCellsMergeIcon}
              label={t("bubble.mergeHint")}
              text={t("bubble.merge")}
              onClick={run(() => editor.chain().mergeCells().run())}
            />
            {divider}
          </>
        )}
        <Item icon={TableCellsSplitIcon} label={t("table.split")} disabled={!state.canSplit} onClick={run(() => editor.chain().splitCell().run())} />
        <Item icon={RowsIcon} label={t("table.deleteRow")} destructive onClick={run(() => editor.chain().deleteRow().run())} />
        <Item icon={ColumnsIcon} label={t("table.deleteColumn")} destructive onClick={run(() => editor.chain().deleteColumn().run())} />
        {divider}
        <Item icon={AlignLeftIcon} label={t("table.alignColumnLeft")} onClick={run(() => setColumnAlign(editor, "left"))} />
        <Item icon={AlignCenterIcon} label={t("table.alignColumnCenter")} onClick={run(() => setColumnAlign(editor, "center"))} />
        <Item icon={AlignRightIcon} label={t("table.alignColumnRight")} onClick={run(() => setColumnAlign(editor, "right"))} />
      </BubbleMenu>
    </>
  );
}
