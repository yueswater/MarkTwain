import { useState } from "react";
import { useTranslation } from "react-i18next";
import { STATEMENT_KINDS } from "@marktwain/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type StatementTarget = { pos: number; kind: string; title: string };

type Props = {
  target: StatementTarget;
  onSubmit: (change: { kind: string; title: string }) => void;
  onUnwrap: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

/** Kind and title of a definition, lemma, theorem or the like. */
export function StatementDialog({ target, onSubmit, onUnwrap, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [kind, setKind] = useState(target.kind);
  const [title, setTitle] = useState(target.title);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ kind, title: title.trim() });
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("statement.editTitle")}</DialogTitle>
            <DialogDescription>{t("statement.titleHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="statement-kind">{t("statement.kind")}</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="statement-kind" aria-label={t("statement.kind")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATEMENT_KINDS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {t(`statement.kinds.${item.id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statement-title">{t("statement.titleLabel")}</Label>
            <Input id="statement-title" value={title} autoFocus onChange={(event) => setTitle(event.target.value)} />
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onUnwrap();
                onClose();
              }}
            >
              {t("statement.unwrap")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("action.cancel", { ns: "common" })}
              </Button>
              <Button type="submit">{t("statement.save")}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
