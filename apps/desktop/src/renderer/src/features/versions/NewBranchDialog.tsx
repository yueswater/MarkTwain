import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  busy: boolean;
  error: string | null;
  onSubmit: (name: string) => Promise<unknown>;
  onClose: () => void;
};

/** Asks for the name of a new change. The name is needed and cannot be one that is used. */
export function NewBranchDialog({ busy, error, onSubmit, onClose }: Props) {
  const { t } = useTranslation("versions");
  const { t: tc } = useTranslation();
  const [name, setName] = useState("");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const done = await onSubmit(name);
            if (done !== undefined) onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("start.title")}</DialogTitle>
            <DialogDescription>{t("start.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="branch-name">{t("start.label")}</Label>
            <Input id="branch-name" value={name} autoFocus placeholder={t("start.placeholder")} onChange={(event) => setName(event.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc("action.cancel")}
            </Button>
            <Button type="submit" disabled={busy || name.trim() === ""}>
              {t("start.title")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
