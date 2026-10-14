import { AlertTriangleIcon, DownloadIcon, EyeIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";
import { useResizableWidth } from "@/lib/resizable-width";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { showNotes, warningItems } from "./build-notes";
import type { BuildState } from "./use-build";

type Props = {
  build: BuildState;
  /** Changes whenever something was saved, a watching preview rebuilds on it */
  saveTick: number;
  onClose: () => void;
  onJump: (documentId: string, block: number) => void;
};

const WATCH_KEY = "marktwain.preview.watch";

function readWatch(): boolean {
  try {
    return localStorage.getItem(WATCH_KEY) !== "0";
  } catch {
    return true;
  }
}

export function PreviewPanel({ build, saveTick, onClose, onJump }: Props) {
  const { t } = useTranslation("build");
  const { t: tRoot } = useTranslation();
  const [exportNote, setExportNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [watch, setWatch] = useState(readWatch);
  const { outcome, building, error, run } = build;
  const { prefs } = usePrefs();
  const { width, separator } = useResizableWidth("marktwain.preview.width", 520, 320, 0.7);

  const errors = outcome?.diagnostics.filter((d) => d.severity === "error") ?? [];
  const items = warningItems(outcome?.diagnostics ?? [], outcome?.mathFailures ?? []);

  // Opening the preview starts watching, and every save rebuilds after a short pause
  useEffect(() => {
    if (!watch) return;
    const timer = setTimeout(() => void run(), outcome ? prefs.previewDelayMs : 0);
    return () => clearTimeout(timer);
    // The outcome only decides the first delay, it must not retrigger the build
  }, [watch, saveTick, run]);

  function toggleWatch(): void {
    setWatch((value) => {
      try {
        localStorage.setItem(WATCH_KEY, value ? "0" : "1");
      } catch {
        // The choice is only a convenience
      }
      return !value;
    });
  }

  async function exportTo(channel: typeof IpcChannel.ExportPdf | typeof IpcChannel.ExportProject): Promise<void> {
    try {
      const result = await api.invoke(channel);
      setExportNote(result ? { ok: true, text: t("exported", { path: result.path }) } : null);
    } catch (e) {
      setExportNote({ ok: false, text: errorMessage(tRoot, e) });
    }
  }

  return (
    <aside className="relative flex shrink-0 flex-col border-l" style={{ width }} aria-label={t("preview")}>
      <div
        {...separator}
        aria-label={t("resize")}
        className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none hover:bg-foreground/10 focus-visible:bg-foreground/20 active:bg-foreground/20"
      />
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-3">
        <h2 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {t("preview")}
          {outcome && outcome.pageCount > 0 && <span className="font-normal">{t("pages", { count: outcome.pageCount })}</span>}
          {building && <RefreshCwIcon className="size-3 animate-spin" aria-label={t("building")} />}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant={watch ? "secondary" : "outline"}
            size="sm"
            aria-pressed={watch}
            title={t("watchHint")}
            onClick={toggleWatch}
          >
            <EyeIcon aria-hidden="true" />
            {t("watch")}
          </Button>
          {!watch && (
            <Button size="sm" onClick={() => void run()} disabled={building}>
              {building ? t("building") : t("build")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <DownloadIcon aria-hidden="true" />
                {t("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void exportTo(IpcChannel.ExportPdf)}>{t("exportPdf")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportTo(IpcChannel.ExportProject)}>{t("exportProject")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" aria-label={t("close")} onClick={onClose}>
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-y bg-destructive/5 px-3 py-2 text-sm text-destructive select-text">
          {error}
        </p>
      )}
      {exportNote && (
        <p
          role={exportNote.ok ? "status" : "alert"}
          className={cn("border-y px-3 py-2 text-sm select-text", exportNote.ok ? "text-muted-foreground" : "bg-destructive/5 text-destructive")}
        >
          {exportNote.text}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40" data-testid="preview-pages">
        {outcome && outcome.pageCount > 0 ? (
          <ol className="flex flex-col items-center gap-4 p-4">
            {Array.from({ length: outcome.pageCount }, (_, index) => (
              <li key={index} className="w-full max-w-[760px]">
                <img
                  src={`marktwain-preview://page/${outcome.revision}/${index}.png`}
                  alt={t("page", { n: index + 1 })}
                  decoding="async"
                  className="block w-full rounded-sm border bg-white shadow-sm"
                />
                <p className="mt-1 text-center text-[11px] text-muted-foreground">{t("page", { n: index + 1 })}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{building ? t("building") : outcome ? t("failed") : t("empty")}</p>
        )}
      </div>

      {showNotes(errors, items) && (
        <div className="max-h-56 shrink-0 overflow-y-auto border-t p-3 text-sm" role="log" aria-label={t("errors")}>
          {errors.length > 0 && <h3 className="mb-1 text-xs font-medium text-destructive">{t("errors")}</h3>}
          <ul className="flex flex-col gap-1">
            {errors.map((d, i) => (
              <li key={`e${i}`} className="select-text">
                <span className="text-destructive">{d.message}</span>
                {d.source ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-1 py-0"
                    onClick={() => onJump(d.source!.documentId, d.source!.block)}
                  >
                    {t("goTo")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {items.length > 0 && (
            <h3 className={cn("mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground", errors.length > 0 && "mt-2")}>
              <AlertTriangleIcon className="size-3" aria-hidden="true" />
              {t("warnings")}
            </h3>
          )}
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {items.map((item, i) => (
              <li key={`w${i}`} className="select-text">
                {item.kind === "configMissing" && t("configMissing", { field: item.fields.join(", ") })}
                {item.kind === "citation" && t("citationNoBibliography", { keys: item.keys.join(", ") })}
                {item.kind === "math" && t("mathFailed", { latex: item.latex })}
                {item.kind === "font" && t("fontMissing", { font: item.font })}
                {item.kind === "other" && (
                  <>
                    {item.message}
                    {item.file ? <span className="ml-1 text-xs">{`${item.file}${item.line ? `:${item.line}` : ""}`}</span> : null}
                    {item.source ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto px-1 py-0"
                        onClick={() => onJump(item.source!.documentId, item.source!.block)}
                      >
                        {t("goTo")}
                      </Button>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
