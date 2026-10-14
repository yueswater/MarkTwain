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

export type CaptionTarget = {
  kind: "table" | "codeBlock";
  caption: string;
  /** 只有表格有附註 */
  notes: string;
};

type Props = {
  target: CaptionTarget;
  onSubmit: (values: { caption: string; notes: string }) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

/** 表格與程式碼區塊的標題（與表格的附註）。 */
export function CaptionDialog({ target, onSubmit, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [caption, setCaption] = useState(target.caption);
  const [notes, setNotes] = useState(target.notes);

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
            onSubmit({ caption: caption.trim(), notes: notes.trim() });
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(target.kind === "table" ? "caption.tableTitle" : "caption.codeTitle")}</DialogTitle>
            <DialogDescription>{t("caption.captionHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="caption-text">{t("caption.captionLabel")}</Label>
            <Textarea
              id="caption-text"
              value={caption}
              autoFocus
              rows={2}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          {target.kind === "table" && (
            <div className="grid gap-2">
              <Label htmlFor="caption-notes">{t("caption.notes")}</Label>
              <Textarea
                id="caption-notes"
                value={notes}
                rows={2}
                onChange={(event) => setNotes(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("caption.notesHint")}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel", { ns: "common" })}
            </Button>
            <Button type="submit">{t("caption.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
