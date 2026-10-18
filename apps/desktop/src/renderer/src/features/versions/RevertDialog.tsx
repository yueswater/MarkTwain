import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rich } from "../../shared/rich";

type Props = {
  /** Reads what changed since the latest version, so the dialog can say how much is thrown away */
  load: () => Promise<{ id: string }[] | undefined>;
  busy: boolean;
  error: string | null;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
};

/** Asks again before what was typed since the latest version is thrown away, since it cannot be undone. */
export function RevertDialog({ load, busy, error, onConfirm, onClose }: Props) {
  const { t } = useTranslation("versions");
  const { t: tc } = useTranslation();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void load().then((items) => !cancelled && setCount(items?.length ?? null));
    return () => {
      cancelled = true;
    };
    // The count is read once, when the dialog opens
  }, []);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("revert.title")}</DialogTitle>
          <DialogDescription>{count === null ? t("revert.description") : t("revert.descriptionCount", { count })}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            <Rich text={error} />
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
