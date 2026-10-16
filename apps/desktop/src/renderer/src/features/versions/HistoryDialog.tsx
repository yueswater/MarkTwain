import { DiffIcon, GitMergeIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { VersionEntry } from "../../../../shared/ipc";
import { relativeTime } from "../project/welcome/relative-time";

type Props = {
  branch: string;
  headId: string;
  load: () => Promise<VersionEntry[]>;
  busy: boolean;
  error: string | null;
  /** Makes the documents as they were in a version, the label is the name of the version in the language of the person */
  onRestore: (snapshotId: string, label: string) => Promise<unknown>;
  /** Shows what a version changed from the one before it */
  onCompare: (entry: VersionEntry, label: string) => void;
  onClose: () => void;
};

/** The versions that lead to the latest one of the branch, each with the way back to it. */
export function HistoryDialog({ branch, headId, load, busy, error, onRestore, onCompare, onClose }: Props) {
  const { t, i18n } = useTranslation("versions");
  const { t: tc } = useTranslation();
  const [entries, setEntries] = useState<VersionEntry[] | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  useEffect(() => {
    void load().then(setEntries);
    // Loaded once when the dialog opens
  }, []);

  const labelOf = (entry: VersionEntry) => entry.message || (entry.parentId === null ? t("history.initial") : t("history.untitled"));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("history.title")}</DialogTitle>
          <DialogDescription>{t("history.description", { branch })}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {entries !== null && entries.length === 0 && <p className="text-sm text-muted-foreground">{t("history.empty")}</p>}
        <ol className="max-h-[60vh] divide-y overflow-y-auto rounded-md border" aria-label={t("history.title")}>
          {(entries ?? []).map((entry) => (
            <li key={entry.id} data-version={entry.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{labelOf(entry)}</span>
                  {entry.parent2Id !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <GitMergeIcon className="size-3" aria-hidden="true" />
                      {t("history.merge")}
                    </span>
                  )}
                  {entry.heads.map((head) => (
                    <span key={head} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      {head}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{relativeTime(entry.createdAt, Date.now(), i18n.language)}</p>
                {asking === entry.id && (
                  <div className="mt-2 grid gap-2 rounded-md bg-muted/50 p-2">
                    <p className="text-sm">{t("history.restoreBody", { label: labelOf(entry) })}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={async () => {
                          const done = await onRestore(entry.id, t("history.restoreMessage", { label: labelOf(entry) }));
                          if (done) onClose();
                        }}
                      >
                        {t("history.restore")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAsking(null)}>
                        {tc("action.cancel")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {entry.parentId !== null && (
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onCompare(entry, labelOf(entry))}>
                  <DiffIcon aria-hidden="true" />
                  {t("history.compare")}
                </Button>
              )}
              {entry.id === headId ? (
                <span className="shrink-0 text-xs text-muted-foreground">{t("history.current")}</span>
              ) : (
                asking !== entry.id && (
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setAsking(entry.id)}>
                    <RotateCcwIcon aria-hidden="true" />
                    {t("history.restore")}
                  </Button>
                )
              )}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
