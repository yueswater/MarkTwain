import type { ReactNode } from "react";
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

type FrameProps = {
  title: string;
  description?: string;
  editing: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onRemove: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
  children: ReactNode;
};

export function AtomDialogFrame({
  title,
  description,
  editing,
  canSubmit,
  onSubmit,
  onRemove,
  onClose,
  onRestoreFocus,
  children,
}: FrameProps) {
  const { t } = useTranslation("editor");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // Focus returns to the editor after closing, by default it goes to the toolbar button and typed text would miss the document
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit();
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          <DialogFooter>
            {editing && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                {t("atom.remove")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel", { ns: "common" })}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {t(editing ? "atom.update" : "atom.insert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** What every one of the three dialogs gets besides its own props. */
export type Common = { onRemove: () => void; onClose: () => void; onRestoreFocus: () => void };
