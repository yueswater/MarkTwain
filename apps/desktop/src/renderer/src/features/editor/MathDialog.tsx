import katex from "katex";
import { useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type MathTarget = {
  kind: "inline" | "block";
  latex: string;
  /** 編輯既有公式時的位置；新增時為 null */
  pos: number | null;
};

type Props = {
  target: MathTarget;
  onSubmit: (latex: string) => void;
  onRemove: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

/** 以 KaTeX 渲染；語法錯誤時回傳 null。 */
export function renderLatex(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: true, output: "htmlAndMathml" });
  } catch {
    return null;
  }
}

export function MathDialog({ target, onSubmit, onRemove, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [latex, setLatex] = useState(target.latex);
  const editing = target.pos !== null;
  const trimmed = latex.trim();
  const html = useMemo(
    () => (trimmed ? renderLatex(trimmed, target.kind === "block") : ""),
    [trimmed, target.kind],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmed || html === null) return;
            onSubmit(trimmed);
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(editing ? "math.editTitle" : "math.insertTitle")}</DialogTitle>
            <DialogDescription>{t("math.hint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="math-latex">{t("math.latex")}</Label>
            <Textarea
              id="math-latex"
              value={latex}
              autoFocus
              rows={3}
              spellCheck={false}
              className="font-mono"
              onChange={(event) => setLatex(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">{t("math.preview")}</span>
            <div
              aria-live="polite"
              className="flex min-h-16 items-center justify-center overflow-x-auto rounded-md border bg-muted/30 p-3"
            >
              {html === "" ? (
                <span className="text-sm text-muted-foreground">{t("math.empty")}</span>
              ) : html === null ? (
                <span role="alert" className="text-sm text-destructive">
                  {t("math.invalid")}
                </span>
              ) : (
                <span data-testid="math-preview" dangerouslySetInnerHTML={{ __html: html }} />
              )}
            </div>
          </div>
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
                {t("math.remove")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel", { ns: "common" })}
            </Button>
            <Button type="submit" disabled={!trimmed || html === null}>
              {t(editing ? "math.update" : "math.insert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
