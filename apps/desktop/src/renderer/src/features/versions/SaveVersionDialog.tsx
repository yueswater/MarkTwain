import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChangeItemView } from "../../../../shared/ipc";
import { ChangeItemRow } from "./ChangeItemRow";

type Props = {
  busy: boolean;
  error: string | null;
  /** The changes that a version can take, as the latest version and the documents now differ */
  load: () => Promise<ChangeItemView[]>;
  /** Resolves true when the version was saved, the dialog closes then. The ids are the changes that are chosen. */
  onSubmit: (message: string, include: string[]) => Promise<boolean>;
  onClose: () => void;
};

/**
 * Asks what was changed, as the message of a commit, and which of the changes go into this version. All are chosen to begin with.
 * What is not chosen stays in the documents as a change that is not saved.
 */
export function SaveVersionDialog({ busy, error, load, onSubmit, onClose }: Props) {
  const { t } = useTranslation("versions");
  const { t: tc } = useTranslation();
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<ChangeItemView[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  useEffect(() => {
    void load().then((loaded) => {
      setItems(loaded);
      setChosen(new Set(loaded.map((item) => item.id)));
    });
    // Loaded once when the dialog opens
  }, []);

  const toggle = (id: string, on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const count = items?.filter((item) => chosen.has(item.id)).length ?? 0;
  const ready = message.trim() !== "" && count > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!ready || !items) return;
            if (await onSubmit(message, items.filter((item) => chosen.has(item.id)).map((item) => item.id))) onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("save.title")}</DialogTitle>
            <DialogDescription>{t("save.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="version-message">{t("save.label")}</Label>
            <Textarea id="version-message" value={message} rows={2} autoFocus placeholder={t("save.placeholder")} onChange={(event) => setMessage(event.target.value)} />
          </div>
          {items !== null && items.length > 0 && (
            <div className="grid gap-2" data-testid="stage">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">{t("stage.title")}</span>
                <span className="text-muted-foreground" data-testid="stage-count">
                  {t("stage.count", { chosen: count, total: items.length })}
                </span>
                <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setChosen(new Set(items.map((item) => item.id)))}>
                  {t("stage.all")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setChosen(new Set())}>
                  {t("stage.none")}
                </Button>
              </div>
              <ul className="grid max-h-[40vh] gap-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <ChangeItemRow key={item.id} item={item} checked={chosen.has(item.id)} onChange={(on) => toggle(item.id, on)} />
                ))}
              </ul>
              {count < items.length && count > 0 && <p className="text-xs text-muted-foreground">{t("stage.rest", { count: items.length - count })}</p>}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc("action.cancel")}
            </Button>
            <Button type="submit" disabled={busy || !ready}>
              {tc("action.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
