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

const LENGTH = /^\d+(\.\d+)?(pt|cm|mm|in|em)$/;

type Props = {
  initial: string;
  onSubmit: (height: string | null) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

export function RowHeightDialog({ initial, onSubmit, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [value, setValue] = useState(initial);
  const trimmed = value.trim();
  const valid = trimmed === "" || LENGTH.test(trimmed);

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
            if (!valid) return;
            onSubmit(trimmed === "" ? null : trimmed);
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("table.rowHeightTitle")}</DialogTitle>
            <DialogDescription>{t("table.rowHeightHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="row-height">{t("table.rowHeightLabel")}</Label>
            <Input
              id="row-height"
              value={value}
              autoFocus
              placeholder="30pt"
              aria-invalid={valid ? undefined : true}
              onChange={(event) => setValue(event.target.value)}
            />
            {!valid && (
              <p role="alert" className="text-xs text-destructive">
                {t("table.rowHeightInvalid")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel", { ns: "common" })}
            </Button>
            <Button type="submit" disabled={!valid}>
              {t("caption.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
