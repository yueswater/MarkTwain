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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { assetUrl } from "./extensions/nodes/figure";

export type FigureTarget = {
  /** 編輯既有的圖時的位置；新增時為 null */
  pos: number | null;
  src: string;
  caption: string;
  width: string | null;
};

const WIDTHS = ["100%", "80%", "60%", "40%"] as const;
const AUTO = "auto";

type Props = {
  target: FigureTarget;
  onSubmit: (values: { caption: string; width: string | null }) => void;
  onRemove: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

export function FigureDialog({ target, onSubmit, onRemove, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [caption, setCaption] = useState(target.caption);
  const [width, setWidth] = useState(target.width ?? AUTO);
  const editing = target.pos !== null;

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
            onSubmit({ caption: caption.trim(), width: width === AUTO ? null : width });
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(editing ? "figure.editTitle" : "figure.insertTitle")}</DialogTitle>
            <DialogDescription>{t("figure.captionHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-40 items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-2">
            <img src={assetUrl(target.src)} alt="" className="max-h-36 max-w-full object-contain" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="figure-caption">{t("figure.caption")}</Label>
            <Textarea
              id="figure-caption"
              value={caption}
              autoFocus
              rows={2}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("figure.width")}</Label>
            <Select value={width} onValueChange={setWidth}>
              <SelectTrigger aria-label={t("figure.width")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>{t("figure.widthAuto")}</SelectItem>
                {WIDTHS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            {editing && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                {t("atom.remove")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel", { ns: "common" })}
            </Button>
            <Button type="submit">{t(editing ? "atom.update" : "atom.insert")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
