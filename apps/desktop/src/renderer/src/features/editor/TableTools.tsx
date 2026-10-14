import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
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
import { Input } from "@/components/ui/input";
import { BordersMenu } from "./BordersMenu";
import { PlacementPicker } from "./PlacementPicker";
import type { Placement } from "@marktwain/schema";
import { setColumnAlign, setColumnWidth, setRowHeight, tableMetrics } from "./table-commands";

type Props = { editor: Editor; onEditCaption: () => void };

/** Second toolbar shown while the cursor is in a table, most commands come from the TipTap table extension. */
export function TableTools({ editor, onEditCaption }: Props) {
  const { t } = useTranslation("editor");

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      grid: e.getAttributes("table").style === "grid",
      placement: (e.getAttributes("table").placement as Placement | null | undefined) ?? null,
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
      metrics: tableMetrics(e),
    }),
    equalityFn: (a, b) => !b || JSON.stringify(a) === JSON.stringify(b),
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
      className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-muted/30 px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      {button(
        t(state.grid ? "table.styleGrid" : "table.styleThreeLine"),
        state.grid ? MinusIcon : Grid3x3Icon,
        () => editor.chain().focus().updateAttributes("table", { style: state.grid ? "three-line" : "grid" }).run(),
        { active: state.grid },
      )}
      <BordersMenu editor={editor} />
      {button(t("table.caption"), TypeIcon, onEditCaption)}
      {divider("e")}
      <PlacementPicker compact value={state.placement} onChange={(placement) => editor.chain().focus().updateAttributes("table", { placement }).run()} />
      {button(t("table.deleteTable"), Trash2Icon, () => editor.chain().focus().deleteTable().run())}
      <div className="ml-3 flex shrink-0 items-center gap-x-4 whitespace-nowrap text-xs text-muted-foreground" data-testid="table-readout">
        <span>{t("table.position", { row: state.metrics.row, rows: state.metrics.rows, column: state.metrics.column, columns: state.metrics.columns })}</span>
        <label className="flex items-center gap-1.5">
          {t("table.columnWidth")}
          <Input
            key={`w${state.metrics.column}-${state.metrics.widthPercent}`}
            aria-label={t("table.columnWidth")}
            className="h-6 w-16 px-1.5 text-xs md:text-xs"
            inputMode="decimal"
            placeholder={t("table.auto")}
            defaultValue={state.metrics.widthPercent ?? ""}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            onBlur={(event) => {
              const value = event.currentTarget.value.trim();
              if (value === "") setColumnWidth(editor, null);
              else if (Number(value) > 0 && Number(value) <= 100) setColumnWidth(editor, Number(value));
            }}
          />
          {t("table.percent")}
        </label>
        <label className="flex items-center gap-1.5">
          {t("table.rowHeightShort")}
          <Input
            key={`h${state.metrics.row}-${state.metrics.height}`}
            aria-label={t("table.rowHeightShort")}
            className="h-6 w-20 px-1.5 text-xs md:text-xs"
            placeholder={t("table.auto")}
            defaultValue={state.metrics.height}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            onBlur={(event) => {
              const value = event.currentTarget.value.trim();
              if (value === "") setRowHeight(editor, null);
              else if (/^\d+(\.\d+)?(pt|cm|mm|in|em)$/.test(value)) setRowHeight(editor, value);
              else if (/^\d+(\.\d+)?$/.test(value)) setRowHeight(editor, `${value}pt`);
            }}
          />
        </label>
      </div>
    </div>
  );
}
