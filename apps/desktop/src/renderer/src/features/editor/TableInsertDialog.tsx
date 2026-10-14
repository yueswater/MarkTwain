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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (values: { rows: number; columns: number; caption: string }) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

const PICKER = 10;

/** Asks for the size and the optional caption before a table is inserted. */
export function TableInsertDialog({ onSubmit, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [hover, setHover] = useState<{ rows: number; cols: number } | null>(null);
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
            onSubmit({ rows, columns, caption: caption.trim() });
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("table.insertTitle")}</DialogTitle>
            <DialogDescription>{t("table.insertHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="text-center text-xs font-medium text-muted-foreground tabular-nums" aria-live="polite">
              {hover ? `${hover.rows} × ${hover.cols}` : `${rows} × ${columns}`}
            </div>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${PICKER}, 1fr)` }}
              onMouseLeave={() => setHover(null)}
              role="group"
              aria-label={t("bubble.sizeHint")}
            >
              {Array.from({ length: PICKER * PICKER }, (_, i) => {
                const r = Math.floor(i / PICKER) + 1;
                const c = (i % PICKER) + 1;
                const lit = hover ? r <= hover.rows && c <= hover.cols : r <= rows && c <= columns;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${r} × ${c}`}
                    aria-pressed={r === rows && c === columns}
                    onMouseEnter={() => setHover({ rows: r, cols: c })}
                    onFocus={() => setHover({ rows: r, cols: c })}
                    onClick={() => {
                      setRows(r);
                      setColumns(c);
                    }}
                    className={cn("aspect-square rounded-[3px] border transition-colors", lit ? "border-foreground bg-foreground/70" : "border-border bg-muted hover:border-foreground/50")}
                  />
                );
              })}
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
