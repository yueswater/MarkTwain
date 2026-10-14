import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onSubmit: (values: { rows: number; columns: number; caption: string }) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

const clamp = (value: number) => Math.min(20, Math.max(1, Math.round(value) || 1));

/** Asks for the size and the optional caption before a table is inserted. */
export function TableInsertDialog({ onSubmit, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [rows, setRows] = useState("3");
  const [columns, setColumns] = useState("3");
  const [caption, setCaption] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ rows: clamp(Number(rows)), columns: clamp(Number(columns)), caption: caption.trim() });
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("table.insertTitle")}</DialogTitle>
            <DialogDescription>{t("table.insertHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="table-rows">{t("table.rows")}</Label>
              <Input id="table-rows" type="number" min={1} max={20} value={rows} onChange={(event) => setRows(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="table-columns">{t("table.columns")}</Label>
              <Input id="table-columns" type="number" min={1} max={20} value={columns} onChange={(event) => setColumns(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="table-caption">{t("caption.captionLabel")}</Label>
            <Textarea
              id="table-caption"
              value={caption}
              autoFocus
              rows={2}
              placeholder={t("table.captionPlaceholder")}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel", { ns: "common" })}
            </Button>
            <Button type="submit">{t("table.insert")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
