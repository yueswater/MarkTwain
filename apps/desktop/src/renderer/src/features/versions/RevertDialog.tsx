import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  busy: boolean;
  error: string | null;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
};

/** Asks again before what was typed since the latest version is thrown away, since it cannot be undone. */
export function RevertDialog({ busy, error, onConfirm, onClose }: Props) {
  const { t } = useTranslation("versions");
  const { t: tc } = useTranslation();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("revert.title")}</DialogTitle>
          <DialogDescription>{t("revert.description")}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tc("action.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (await onConfirm()) onClose();
            }}
          >
            {t("revert.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
