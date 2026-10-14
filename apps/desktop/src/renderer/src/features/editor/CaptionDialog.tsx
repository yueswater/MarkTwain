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
import { PlacementPicker } from "./PlacementPicker";
import type { Placement } from "@marktwain/schema";

export type CaptionTarget = {
  kind: "table" | "codeBlock";
  caption: string;
  /** Only tables have notes */
  notes: string;
  /** Only tables float */
  placement?: Placement | null;
};

type Props = {
  target: CaptionTarget;
  onSubmit: (values: { caption: string; notes: string; placement: Placement | null }) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

/** Caption of a table or a code block, plus the notes of a table. */
export function CaptionDialog({ target, onSubmit, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [caption, setCaption] = useState(target.caption);
  const [notes, setNotes] = useState(target.notes);
  const [placement, setPlacement] = useState<Placement | null>(target.placement ?? null);

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
            onSubmit({ caption: caption.trim(), notes: notes.trim(), placement });
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
              placeholder={t(target.kind === "table" ? "table.captionPlaceholder" : "caption.codeTitle")}
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
          {target.kind === "table" && (
            <div className="grid gap-2">
              <Label>{t("placement.label")}</Label>
              <PlacementPicker value={placement} onChange={setPlacement} />
              <p className="text-xs text-muted-foreground">{t("placement.followDefault")}</p>
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
