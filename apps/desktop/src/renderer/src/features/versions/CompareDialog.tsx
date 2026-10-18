import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CompareView } from "../../../../shared/ipc";
import { ChangeList } from "./ChangeList";
import { Rich } from "../../shared/rich";

type Props = {
  /** The name of the version, in the language of the person */
  label: string;
  /** Two versions that were picked, and not a version with the one before it */
  pair?: boolean;
  load: () => Promise<CompareView | undefined>;
  error: string | null;
  onClose: () => void;
};

/** What a version changed, as the blocks that were added, removed and changed. */
export function CompareDialog({ label, pair = false, load, error, onClose }: Props) {
  const { t } = useTranslation("versions");
  const [view, setView] = useState<CompareView | null>(null);
  useEffect(() => {
    void load().then((loaded) => loaded && setView(loaded));
    // Loaded once when the dialog opens
  }, []);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t(pair ? "compare.titlePair" : "compare.title", { label })}</DialogTitle>
          <DialogDescription>{t(pair ? "compare.descriptionPair" : "compare.description")}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            <Rich text={error} />
          </p>
        )}
        <div className="max-h-[65vh] overflow-y-auto pr-1" data-testid="compare-changes">
          {view && <ChangeList view={view} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
