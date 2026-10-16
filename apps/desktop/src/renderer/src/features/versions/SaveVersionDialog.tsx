import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  busy: boolean;
  error: string | null;
  /** Resolves when the version was saved, the dialog closes then */
  onSubmit: (message: string) => Promise<unknown>;
  onClose: () => void;
};

/** Asks what was changed, and makes a version of the documents as they are. */
export function SaveVersionDialog({ busy, error, onSubmit, onClose }: Props) {
  const { t } = useTranslation("versions");
  const { t: tc } = useTranslation();
  const [message, setMessage] = useState("");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const done = await onSubmit(message);
            if (done !== undefined) onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("save.title")}</DialogTitle>
            <DialogDescription>{t("save.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="version-message">{t("save.label")}</Label>
            <Textarea id="version-message" value={message} rows={3} autoFocus placeholder={t("save.placeholder")} onChange={(event) => setMessage(event.target.value)} />
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
            <Button type="submit" disabled={busy}>
              {tc("action.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
