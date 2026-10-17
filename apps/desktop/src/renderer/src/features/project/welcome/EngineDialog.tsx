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
  const options: { id: OutputEngine; disabled: boolean; hint?: string }[] = [
    { id: "typst", disabled: false },
    { id: "latex", disabled: latex === null || !latex.available, hint: latex === null ? t("engine.checking") : reason ? t(`engine.latex.missing.${reason}`) : undefined },
    { id: "word", disabled: true, hint: t("engine.word.note") },
  ];
  // Only a reason that the person can do something about is written out, the rest is in the tooltip of the square
  const problem = options.find((option) => option.id === "latex")?.hint;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-lg" data-testid="engine-dialog">
        <DialogHeader>
          <DialogTitle>{t("engine.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("engine.description")}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label={t("engine.title")} className="grid grid-cols-3 gap-3">
          {options.map((option) => (
            <label
              key={option.id}
              title={option.hint}
              className={cn(
                "relative flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 bg-background transition-colors",
                engine === option.id ? "border-foreground" : "border-border hover:bg-muted/50",
                option.disabled && "cursor-not-allowed opacity-40 hover:bg-background",
              )}
            >
              <input
                type="radio"
                name="engine"
                value={option.id}
                className="absolute inset-0 size-full cursor-[inherit] opacity-0"
                aria-label={t(`engine.${option.id}.name`)}
                checked={engine === option.id}
                disabled={option.disabled}
                onChange={() => setEngine(option.id)}
              />
              <EngineLogo engine={option.id} name={t(`engine.${option.id}.name`)} />
            </label>
          ))}
        </div>
        {problem && (
          <p role="status" className="text-xs text-muted-foreground">
            {problem}
          </p>
        )}
        <p role="note" className="text-xs text-muted-foreground">
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

/** The name of each tool as it is usually written, so a person knows it at a glance. */
function EngineLogo({ engine, name }: { engine: OutputEngine; name: string }) {
  if (engine === "typst") {
    return (
      <span aria-hidden="true" className="pointer-events-none text-3xl font-bold tracking-tight lowercase" style={{ color: "#239dad" }}>
        {name}
      </span>
    );
  }
  if (engine === "latex") {
    return (
      <span aria-hidden="true" className="pointer-events-none text-3xl font-medium" style={{ fontFamily: "'Latin Modern Roman', 'Computer Modern', Georgia, serif" }}>
        L<span className="relative -top-[0.32em] -ml-[0.36em] text-[0.7em]">A</span>
        <span className="-ml-[0.15em]">T</span>
        <span className="relative top-[0.22em] -ml-[0.1em]">E</span>
        <span className="-ml-[0.1em]">X</span>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="pointer-events-none flex size-14 items-center justify-center rounded-xl text-3xl font-bold text-white" style={{ background: "#185abd" }}>
      {name.charAt(0)}
    </span>
  );
}
