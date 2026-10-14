import { AlertTriangleIcon, DownloadIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { BuildDiagnostic } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import type { BuildState } from "./use-build";

type Props = {
  build: BuildState;
  onClose: () => void;
  onJump: (documentId: string, block: number) => void;
};

function message(d: BuildDiagnostic): string {
  return d.message;
}

export function PreviewPanel({ build, onClose, onJump }: Props) {
  const { t } = useTranslation("build");
  const { t: tRoot } = useTranslation();
  const [exportNote, setExportNote] = useState<{ ok: boolean; text: string } | null>(null);
  const { outcome, building, error } = build;
  const errors = outcome?.diagnostics.filter((d) => d.severity === "error") ?? [];
  const warnings = outcome?.diagnostics.filter((d) => d.severity === "warning") ?? [];
  // One line for all unfilled settings, not one per field
  const uncited = warnings.filter((d) => d.code === "citation-no-bibliography").map((d) => d.message);
  const missingFields = warnings.filter((d) => d.code === "config-missing").map((d) => d.message);

  async function exportTo(channel: typeof IpcChannel.ExportPdf | typeof IpcChannel.ExportProject): Promise<void> {
    try {
      const result = await api.invoke(channel);
      setExportNote(result ? { ok: true, text: t("exported", { path: result.path }) } : null);
    } catch (e) {
      setExportNote({ ok: false, text: errorMessage(tRoot, e) });
    }
  }

  return (
    <aside className="flex w-[44%] min-w-80 shrink-0 flex-col border-l" aria-label={t("preview")}>
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <h2 className="text-xs font-medium text-muted-foreground">{t("preview")}</h2>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={() => void build.run()} disabled={building}>
            {building ? t("building") : t("build")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <DownloadIcon aria-hidden="true" />
                {t("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!outcome?.previewUrl} onSelect={() => void exportTo(IpcChannel.ExportPdf)}>
                {t("exportPdf")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportTo(IpcChannel.ExportProject)}>
                {t("exportProject")}
              </DropdownMenuItem>
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
          className={`border-y px-3 py-2 text-sm select-text ${exportNote.ok ? "text-muted-foreground" : "bg-destructive/5 text-destructive"}`}
        >
          {exportNote.text}
        </p>
      )}

      <div className="min-h-0 flex-1">
        {outcome?.previewUrl ? (
          <iframe key={outcome.previewUrl} src={outcome.previewUrl} title={t("previewTitle")} className="size-full border-0" />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{building ? t("building") : outcome ? t("failed") : t("empty")}</p>
        )}
      </div>

      {(errors.length > 0 || warnings.length > 0 || (outcome?.mathFailures.length ?? 0) > 0) && (
        <div className="max-h-56 shrink-0 overflow-y-auto border-t p-3 text-sm" role="log" aria-label={t("errors")}>
          {errors.length > 0 && <h3 className="mb-1 text-xs font-medium text-destructive">{t("errors")}</h3>}
          <ul className="flex flex-col gap-1">
            {errors.map((d, i) => (
              <li key={`e${i}`} className="select-text">
                <span className="text-destructive">{message(d)}</span>
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
          {(warnings.length > 0 || (outcome?.mathFailures.length ?? 0) > 0) && (
            <h3 className="mt-2 mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <AlertTriangleIcon className="size-3" aria-hidden="true" />
              {t("warnings")}
            </h3>
          )}
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {missingFields.length > 0 && (
              <li className="select-text">{t("configMissing", { field: missingFields.join(", ") })}</li>
            )}
            {uncited.length > 0 && (
              <li className="select-text">{t("citationNoBibliography", { keys: uncited.join(", ") })}</li>
            )}
            {outcome?.mathFailures.map((latex, i) => (
              <li key={`m${i}`} className="select-text">
                {t("mathFailed", { latex })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
