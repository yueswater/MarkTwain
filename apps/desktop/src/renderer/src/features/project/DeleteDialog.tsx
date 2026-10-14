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

type Props = {
  title: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteDialog({ title, onConfirm, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("document.deleteTitle", { ns: "project" })}</DialogTitle>
          <DialogDescription>{t("document.deleteBody", { ns: "project", title })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {t("action.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
