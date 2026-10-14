import type { Editor } from "@tiptap/core";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ColumnsIcon,
  RowsIcon,
  Table2Icon,
  Trash2Icon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type Props = { editor: Editor; onEditCaption: () => void };

/** 游標在表格裡時顯示的第二列工具；指令都是 TipTap 表格擴充提供的。 */
export function TableTools({ editor, onEditCaption }: Props) {
  const { t } = useTranslation("editor");

  const button = (label: string, Icon: LucideIcon, run: () => void) => (
    <Button
      key={label}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
    >
      <Icon aria-hidden="true" />
    </Button>
  );

  /** 整欄的對齊：設定目前儲存格所在的欄（表頭與內容格各自套用）。 */
  const align = (value: "left" | "center" | "right") => () =>
    editor
      .chain()
      .focus()
      .setCellAttribute("align", value)
      .run();

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
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("table.alignLeft"), AlignLeftIcon, align("left"))}
      {button(t("table.alignCenter"), AlignCenterIcon, align("center"))}
      {button(t("table.alignRight"), AlignRightIcon, align("right"))}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      {button(t("table.caption"), TypeIcon, onEditCaption)}
      {button(t("table.deleteTable"), Trash2Icon, () => editor.chain().focus().deleteTable().run())}
    </div>
  );
}
