import { AlertTriangleIcon, DownloadIcon, EyeIcon, RefreshCwIcon, StampIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import type { OutputEngine } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import type { ConfigFields } from "@marktwain/schema";
import { configFieldName, friendlyKind, showNotes, unknownCommandOf, warningItems } from "./build-notes";
import { ExportCheckDialog } from "./ExportCheckDialog";
import { missingForSubmission } from "./export-check";
import { PdfPreview } from "./PdfPreview";
import type { BuildState } from "./use-build";
import { Rich } from "../../shared/rich";

type Props = {
  build: BuildState;
  /** Changes whenever something was saved, a watching preview rebuilds on it */
  saveTick: number;
  /** Tells projects apart, the place in the preview is kept for each */
  placeKey: string;
  /** What the project is written for, the folder of a project can be exported only for Typst */
  engine: OutputEngine;
  /** Opens the settings at the page of the information of the thesis */
  onFillIn: () => void;
  onClose: () => void;
  onJump: (documentId: string, block: number) => void;
  /** The block that the editor is at, the preview follows it */
  follow: { documentId: string; block: number; nonce: number; mode: "caret" | "scroll"; fraction: number } | null;
  /** The reader clicked the text of the PDF, the editor goes to its block */
  onPick: (documentId: string, block: number) => void;
};

const WATCH_KEY = "marktwain.preview.watch";
const WATERMARK_KEY = "marktwain.preview.watermark";

function readWatermark(): boolean {
  try {
    return localStorage.getItem(WATERMARK_KEY) === "1";
  } catch {
    return false;
  }
}

function readWatch(): boolean {
  try {
    return localStorage.getItem(WATCH_KEY) !== "0";
  } catch {
    return true;
  }
}

export function PreviewPanel({ build, saveTick, placeKey, engine, onFillIn, onClose, onJump, follow, onPick }: Props) {
  const { t } = useTranslation("build");
  const { t: tConfig } = useTranslation("config");
  const { t: tRoot } = useTranslation();
  const [exportNote, setExportNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [watch, setWatch] = useState(readWatch);
  const [watermark, setWatermark] = useState(readWatermark);
  const started = useRef(false);
  const { outcome, building, error, run } = build;
  const { prefs } = usePrefs();
  const { width, separator } = useResizableWidth("marktwain.preview.width", 520, 320, 0.7);

  const errors = outcome?.diagnostics.filter((d) => d.severity === "error") ?? [];
  // An unknown command is named in the message, so the person knows what to look for
  const friendlyText = (message: string): string => {
    const kind = friendlyKind(message);
    const command = kind === "command" ? unknownCommandOf(message) : null;
    return command ? t("friendly.commandNamed", { command }) : t(`friendly.${kind}`);
  };
  // A failed build lists its errors in place of the pages, the area below the pages keeps the warnings
  const failed = outcome !== null && !outcome.ok && !building;
  const notesErrors = failed ? [] : errors;
  const items = warningItems(outcome?.diagnostics ?? [], outcome?.mathFailures ?? []);

  // Opening the preview starts watching, and every save rebuilds after a short pause
  useEffect(() => {
    if (!watch) return;
    const timer = setTimeout(() => void run(), outcome ? prefs.previewDelayMs : 0);
    return () => clearTimeout(timer);
    // The outcome only decides the first delay, it must not retrigger the build
  }, [watch, saveTick, run]);

  // The builds of the preview draw the watermark only while the switch is on, a change builds again
  useEffect(() => {
    void api.invoke(IpcChannel.BuildSetWatermark, { on: watermark }).then(() => {
      if (started.current) void run();
      started.current = true;
    });
    try {
      localStorage.setItem(WATERMARK_KEY, watermark ? "1" : "0");
    } catch {
      // The choice is only a convenience
    }
    // Only the switch matters, run is stable
  }, [watermark]);

  /** The watermark is drawn only when the school has one or the project has an image, otherwise the switch and the final copy change nothing. */
  async function hasWatermark(): Promise<boolean> {
    try {
      const info = await api.invoke(IpcChannel.WatermarkGet);
      return info.mode === "custom" ? info.custom !== null : info.mode === "school" ? info.school !== null : false;
    } catch {
      return true;
    }
  }

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

  /** A PDF is checked first: parts of the cover that are empty print as ○○○ or as nothing, and the person is asked before. */
  const [asking, setAsking] = useState<{ channel: typeof IpcChannel.ExportPdf | typeof IpcChannel.ExportFinalPdf; missing: (keyof ConfigFields)[] } | null>(null);
  async function requestExport(channel: typeof IpcChannel.ExportPdf | typeof IpcChannel.ExportFinalPdf): Promise<void> {
    try {
      const { fields } = await api.invoke(IpcChannel.ConfigGet);
      const missing = missingForSubmission(fields);
      if (missing.length > 0) setAsking({ channel, missing });
      else await exportTo(channel);
    } catch (e) {
      setExportNote({ ok: false, text: errorMessage(tRoot, e) });
    }
  }

  async function exportTo(channel: typeof IpcChannel.ExportPdf | typeof IpcChannel.ExportFinalPdf | typeof IpcChannel.ExportProject): Promise<void> {
    try {
      const result = await api.invoke(channel);
      // A final copy without a watermark image is told so, since the word final promises a watermark
      const note = result && channel === IpcChannel.ExportFinalPdf && !(await hasWatermark()) ? ` ${t("noWatermark")}` : "";
      setExportNote(result ? { ok: true, text: `${t("exported", { path: result.path })}${note}` } : null);
      // The export was made, so a failure that the preview still shows is out of date
      if (result && outcome && !outcome.ok) void run();
    } catch (e) {
      setExportNote({ ok: false, text: errorMessage(tRoot, e) });
    }
  }

  return (
    <aside className="relative flex shrink-0 flex-col border-l" style={{ width }} aria-label={t("preview")}>
      {asking && (
        <ExportCheckDialog
          missing={asking.missing}
          final={asking.channel === IpcChannel.ExportFinalPdf}
          onClose={() => setAsking(null)}
          onFill={() => {
            setAsking(null);
            onFillIn();
          }}
          onExport={() => {
            const channel = asking.channel;
            setAsking(null);
            void exportTo(channel);
          }}
        />
      )}
      <div
        {...separator}
        aria-label={t("resize")}
        className="resize-handle absolute inset-y-0 -left-1.5 z-10 w-3 cursor-col-resize touch-none outline-none"
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
          <Button
            variant={watermark ? "secondary" : "outline"}
            size="sm"
            aria-pressed={watermark}
            title={t("watermarkHint")}
            onClick={() => {
              // Turning it on says so when there is nothing to draw
              if (!watermark) void hasWatermark().then((has) => !has && setExportNote({ ok: false, text: t("noWatermark") }));
              setWatermark((value) => !value);
            }}
          >
            <StampIcon aria-hidden="true" />
            {t("watermark")}
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
              <DropdownMenuItem onSelect={() => void requestExport(IpcChannel.ExportPdf)}>{t("exportPdf")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void requestExport(IpcChannel.ExportFinalPdf)}>{t("exportFinalPdf")}</DropdownMenuItem>
              {engine === "typst" && (
                <DropdownMenuItem onSelect={() => void exportTo(IpcChannel.ExportProject)}>{t("exportProject")}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" aria-label={t("close")} onClick={onClose}>
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-y bg-destructive/5 px-3 py-2 text-sm text-destructive select-text">
          <Rich text={error} />
        </p>
      )}
      {exportNote && (
        <p
          role={exportNote.ok ? "status" : "alert"}
          className={cn("border-y px-3 py-2 text-sm select-text", exportNote.ok ? "text-muted-foreground" : "bg-destructive/5 text-destructive")}
        >
          <Rich text={exportNote.text} />
        </p>
      )}

      <div className="min-h-0 flex-1 bg-muted/40" data-testid="preview-pages">
        {outcome && outcome.ok ? (
          <PdfPreview revision={outcome.revision} placeKey={placeKey} anchors={outcome.anchors} follow={follow} onPick={(target) => onPick(target.documentId, target.block)} />
        ) : failed ? (
          <div role="alert" className="flex h-full flex-col gap-3 overflow-y-auto p-4 text-sm">
            <div>
              <p className="font-medium text-destructive">{t("failed")}</p>
              <p className="text-muted-foreground">{t("failedHint")}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {errors.map((d, i) => (
                <li key={`f${i}`} className="select-text rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-destructive"><Rich text={friendlyText(d.message)} /></p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {t("detail")}: {d.message}
                  </p>
                  {d.source ? (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => onJump(d.source!.documentId, d.source!.block)}>
                      {t("goTo")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{building ? t("building") : outcome ? t("failed") : t("empty")}</p>
        )}
      </div>

      {showNotes(notesErrors, items) && (
        <div className="max-h-56 shrink-0 overflow-y-auto border-t p-3 text-sm" role="log" aria-label={t("errors")}>
          {notesErrors.length > 0 && <h3 className="mb-1 text-xs font-medium text-destructive">{t("errors")}</h3>}
          <ul className="flex flex-col gap-1">
            {notesErrors.map((d, i) => (
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
            <h3 className={cn("mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground", notesErrors.length > 0 && "mt-2")}>
              <AlertTriangleIcon className="size-3" aria-hidden="true" />
              {t("warnings")}
            </h3>
          )}
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {items.map((item, i) => (
              <li key={`w${i}`} className="select-text">
                {item.kind === "configMissing" && <Rich text={t("configMissing", { field: item.fields.map((key) => tConfig(`field.${configFieldName(key)}`, { defaultValue: key })).join(", ") })} />}
                {item.kind === "citation" && <Rich text={t("citationNoBibliography", { keys: item.keys.join(", ") })} />}
                {item.kind === "glyphMissing" && <Rich text={t("glyphMissing", { chars: item.chars })} />}
                {item.kind === "brokenRef" && (
                  <>
                    <Rich text={t("brokenRef", { label: item.label })} />
                    {item.source ? (
                      <Button variant="link" size="sm" className="h-auto px-1 py-0" onClick={() => onJump(item.source!.documentId, item.source!.block)}>
                        {t("goTo")}
                      </Button>
                    ) : null}
                  </>
                )}
                {item.kind === "defaultChapter" && (
                  <>
                    <Rich text={t("defaultChapter", { title: item.title })} />
                    {item.source ? (
                      <Button variant="link" size="sm" className="h-auto px-1 py-0" onClick={() => onJump(item.source!.documentId, item.source!.block)}>
                        {t("goTo")}
                      </Button>
                    ) : null}
                  </>
                )}
                {item.kind === "duplicateLabel" && (
                  <>
                    <Rich text={t("duplicateLabel", { label: item.label })} />
                    {item.source ? (
                      <Button variant="link" size="sm" className="h-auto px-1 py-0" onClick={() => onJump(item.source!.documentId, item.source!.block)}>
                        {t("goTo")}
                      </Button>
                    ) : null}
                  </>
                )}
                {item.kind === "image" && (
                  <>
                    {t(item.reason === "missing" ? "imageMissing" : "imageUnreadable")}
                    {item.source ? (
                      <Button variant="link" size="sm" className="h-auto px-1 py-0" onClick={() => onJump(item.source!.documentId, item.source!.block)}>
                        {t("goTo")}
                      </Button>
                    ) : null}
                  </>
                )}
                {item.kind === "unknownCitation" && <Rich text={t("unknownCitation", { keys: item.keys.join(", ") })} />}
                {item.kind === "approximate" && t(`approximate.${item.feature}`, { defaultValue: item.feature })}
                {item.kind === "math" && <Rich text={t("mathFailed", { latex: item.latex })} />}
                {item.kind === "font" && <Rich text={t("fontMissing", { font: item.font })} />}
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
