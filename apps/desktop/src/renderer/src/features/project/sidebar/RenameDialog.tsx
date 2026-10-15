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

type Props = {
  initialTitle: string;
  onSubmit: (title: string) => void;
  onClose: () => void;
};

export function RenameDialog({ initialTitle, onSubmit, onClose }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(title);
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("document.renameTitle", { ns: "project" })}</DialogTitle>
            <DialogDescription>{t("document.titleHint", { ns: "project" })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="document-title">{t("document.titleLabel", { ns: "project" })}</Label>
            <Input
              id="document-title"
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel")}
            </Button>
            <Button type="submit">{t("action.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
