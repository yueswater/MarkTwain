import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import type { LatexStatus, OutputEngine } from "../../../../../shared/ipc/index";
import { api } from "../../../shared/api";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (engine: OutputEngine) => void;
};

/** Why LaTeX cannot be picked on this computer, the first thing that is missing. */
function latexReason(status: LatexStatus | null): "tex" | "citation-style-language" | "template" | null {
  if (status === null || status.available) return null;
  return status.missing[0] ?? "tex";
}

/**
 * Asked before a project is created, since the engine cannot be changed afterwards. Word cannot be picked yet,
 * LaTeX only when this computer has a TeX Live that can build the template.
 */
export function EngineDialog({ open, onCancel, onConfirm }: Props) {
  const { t } = useTranslation("project");
  const [engine, setEngine] = useState<OutputEngine>("typst");
  const [latex, setLatex] = useState<LatexStatus | null>(null);

  useEffect(() => {
    if (!open) return;
    setEngine("typst");
    let cancelled = false;
    void api
      .invoke(IpcChannel.ToolchainStatus)
      .then((status) => !cancelled && setLatex(status.latex))
      .catch(() => !cancelled && setLatex({ available: false, missing: ["tex"] }));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const reason = latexReason(latex);
  const options: { id: OutputEngine; disabled: boolean; note: string }[] = [
    { id: "typst", disabled: false, note: t("engine.typst.note") },
    {
      id: "latex",
      disabled: latex === null || !latex.available,
      note: latex === null ? t("engine.checking") : reason ? t(`engine.latex.missing.${reason}`) : t("engine.latex.note"),
    },
    { id: "word", disabled: true, note: t("engine.word.note") },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-lg" data-testid="engine-dialog">
        <DialogHeader>
          <DialogTitle>{t("engine.title")}</DialogTitle>
          <DialogDescription>{t("engine.description")}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label={t("engine.title")} className="grid gap-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
                engine === option.id && "border-foreground",
                option.disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="engine"
                value={option.id}
                className="mt-1"
                checked={engine === option.id}
                disabled={option.disabled}
                onChange={() => setEngine(option.id)}
              />
              <span className="grid gap-0.5">
                <span className="font-medium">{t(`engine.${option.id}.name`)}</span>
                <span className="text-xs text-muted-foreground">{option.note}</span>
              </span>
            </label>
          ))}
        </div>
        <p role="note" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {t("engine.warning")}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("engine.cancel")}
          </Button>
          <Button type="button" onClick={() => onConfirm(engine)}>
            {t("engine.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
