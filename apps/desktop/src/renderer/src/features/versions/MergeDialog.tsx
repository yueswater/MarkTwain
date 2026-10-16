import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ChoiceInput, MergePreview } from "../../../../shared/ipc";
import { ConflictResolver } from "./ConflictResolver";
import { countResolved } from "./merge-choices";

type Props = {
  /** The branch that is merged into the main line, the one that is open */
  source: string;
  /** Whether the documents have changes that are not saved as a version, a merge cannot use them */
  dirty: boolean;
  busy: boolean;
  error: string | null;
  preview: (source: string) => Promise<MergePreview | undefined>;
  onMerge: (source: string, choices: Record<string, ChoiceInput>, deleteSource: boolean) => Promise<boolean>;
  /** Closes this dialog and opens the one that saves a version */
  onSaveFirst: () => void;
  onClose: () => void;
};

/** Merges the change that is open into the main line. Conflicts are shown side by side and nothing is written until each has a choice. */
export function MergeDialog({ source, dirty, busy, error, preview, onMerge, onSaveFirst, onClose }: Props) {
  const { t } = useTranslation("versions");
  const { t: tc } = useTranslation();
  const [plan, setPlan] = useState<MergePreview | null>(null);
  const [choices, setChoices] = useState<Record<string, ChoiceInput>>({});
  const [deleteSource, setDeleteSource] = useState(true);

  useEffect(() => {
    if (dirty) return;
    void preview(source).then((loaded) => loaded && setPlan(loaded));
    // Looked at once when the dialog opens
  }, []);

  const conflicts = plan?.kind === "conflicts" ? plan.conflicts : [];
  const done = countResolved(conflicts, choices);
  const ready = plan !== null && plan.kind !== "up-to-date" && done === conflicts.length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("merge.title", { name: source })}</DialogTitle>
          <DialogDescription>
            {dirty && t("merge.needSave")}
            {!dirty && plan === null && t("merge.loading")}
            {plan?.kind === "up-to-date" && t("merge.upToDate")}
            {plan?.kind === "fast-forward" && t("merge.fastForward")}
            {plan?.kind === "clean" && t("merge.clean")}
            {plan?.kind === "conflicts" && t("merge.conflicts", { count: conflicts.length })}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {conflicts.length > 0 && (
          <div className="max-h-[55vh] overflow-y-auto pr-1">
            <ConflictResolver conflicts={conflicts} choices={choices} onChoose={(id, choice) => setChoices((current) => ({ ...current, [id]: choice }))} />
          </div>
        )}
        {plan !== null && plan.kind !== "up-to-date" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={deleteSource} onChange={(event) => setDeleteSource(event.target.checked)} />
            {t("merge.deleteAfter")}
          </label>
        )}
        <DialogFooter className="items-center">
          {conflicts.length > 0 && <span className="mr-auto text-sm text-muted-foreground">{t("merge.progress", { done, total: conflicts.length })}</span>}
          <Button type="button" variant="outline" onClick={onClose}>
            {tc("action.cancel")}
          </Button>
          {dirty ? (
            <Button onClick={onSaveFirst}>{t("merge.saveFirst")}</Button>
          ) : (
            <Button
              disabled={busy || !ready}
              onClick={async () => {
                if (await onMerge(source, choices, deleteSource)) onClose();
              }}
            >
              {t("merge.submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
