import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  ArrowUpDownIcon,
  ColumnsIcon,
  Grid3x3Icon,
  MinusIcon,
  RowsIcon,
  Table2Icon,
  TableCellsMergeIcon,
  TableCellsSplitIcon,
  Trash2Icon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setColumnAlign } from "./table-commands";

type Props = { editor: Editor; onEditCaption: () => void; onEditRowHeight: () => void };

/** Second toolbar shown while the cursor is in a table, most commands come from the TipTap table extension. */
export function TableTools({ editor, onEditCaption, onEditRowHeight }: Props) {
  const { t } = useTranslation("editor");

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      grid: e.getAttributes("table").style === "grid",
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
    }),
  });

  const button = (label: string, Icon: LucideIcon, run: () => void, options: { active?: boolean; disabled?: boolean } = {}) => (
    <Button
      key={label}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={options.active}
      disabled={options.disabled}
      className={cn(options.active && "bg-muted")}
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
    >
      <Icon aria-hidden="true" />
    </Button>
  );

  const divider = (key: string) => <span key={key} className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;
  const valign = (value: "top" | "middle" | "bottom") => () => editor.chain().focus().setCellAttribute("valign", value).run();

  return (
    <div
      role="toolbar"
      aria-label={t("table.label")}
      className="flex shrink-0 flex-wrap items-center gap-0.5 border-b bg-muted/30 px-3 py-1"
    >
      {button(t("table.addRow"), RowsIcon, () => editor.chain().focus().addRowAfter().run())}
      {button(t("table.addColumn"), ColumnsIcon, () => editor.chain().focus().addColumnAfter().run())}
      {button(t("table.deleteRow"), Trash2Icon, () => editor.chain().focus().deleteRow().run())}
      {button(t("table.deleteColumn"), Trash2Icon, () => editor.chain().focus().deleteColumn().run())}
      {button(t("table.toggleHeader"), Table2Icon, () => editor.chain().focus().toggleHeaderRow().run())}
      {divider("a")}
      {button(t("table.merge"), TableCellsMergeIcon, () => editor.chain().focus().mergeCells().run(), { disabled: !state.canMerge })}
      {button(t("table.split"), TableCellsSplitIcon, () => editor.chain().focus().splitCell().run(), { disabled: !state.canSplit })}
      {divider("b")}
      {button(t("table.alignColumnLeft"), AlignLeftIcon, () => setColumnAlign(editor, "left"))}
      {button(t("table.alignColumnCenter"), AlignCenterIcon, () => setColumnAlign(editor, "center"))}
      {button(t("table.alignColumnRight"), AlignRightIcon, () => setColumnAlign(editor, "right"))}
      {divider("c")}
      {button(t("table.valignTop"), AlignVerticalJustifyStartIcon, valign("top"))}
      {button(t("table.valignMiddle"), AlignVerticalJustifyCenterIcon, valign("middle"))}
      {button(t("table.valignBottom"), AlignVerticalJustifyEndIcon, valign("bottom"))}
      {divider("d")}
      {button(t("table.rowHeight"), ArrowUpDownIcon, onEditRowHeight)}
      {button(
        t(state.grid ? "table.styleGrid" : "table.styleThreeLine"),
        state.grid ? MinusIcon : Grid3x3Icon,
        () => editor.chain().focus().updateAttributes("table", { style: state.grid ? "three-line" : "grid" }).run(),
        { active: state.grid },
      )}
      {button(t("table.caption"), TypeIcon, onEditCaption)}
      {button(t("table.deleteTable"), Trash2Icon, () => editor.chain().focus().deleteTable().run())}
    </div>
  );
}
