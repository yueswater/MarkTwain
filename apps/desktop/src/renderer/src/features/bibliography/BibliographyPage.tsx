import { PlusIcon, TriangleAlertIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocumentSummary } from "../../../../shared/ipc";
import { BibliographyManager } from "./BibliographyManager";
import { BibliographySource } from "./BibliographySource";
import { useBibliography } from "./bibliography-context";

type Props = {
  documents: DocumentSummary[];
  onOpenDocument: (id: string) => void;
};

type Mode = "manager" | "source";

/** The bibliography of the project, a manager with a list and a form or the BibTeX source. */
export function BibliographyPage({ documents, onOpenDocument }: Props) {
  const { t } = useTranslation("bibliography");
  const { view, importFile } = useBibliography();
  const [mode, setMode] = useState<Mode>("manager");
  const [startKey, setStartKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined): Promise<void> {
    if (!file) return;
    const outcome = await importFile(file.name, await file.text());
    if (outcome) {
      // The counts, then the keys that were left out, so the person knows which ones to look at
      const names = (keys: string[]) => (keys.length > 5 ? `${keys.slice(0, 5).join(", ")}…` : keys.join(", "));
      setMessage(
        [
          t("imported", { added: outcome.added, skipped: outcome.skipped.length, errors: outcome.errors.length }),
          outcome.skipped.length > 0 ? t("importedSkippedNames", { keys: names(outcome.skipped) }) : "",
          outcome.errors.length > 0 ? t("importedErrorNames", { keys: names(outcome.errors) }) : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    }
  }

  const problems = [
    ...view.errors.map((e) => t("problems.unreadable", { line: e.line, message: t(`problems.reason.${e.message.replace(/ (\w)/g, (_, c: string) => c.toUpperCase())}`, { defaultValue: e.message }) })),
    ...view.duplicates.map((key) => t("problems.duplicate", { key })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="bibliography-page">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <h2 className="text-sm font-medium">{t("title")}</h2>
        <div role="group" aria-label={t("modes.label")} className="flex rounded-md border p-0.5">
          {(["manager", "source"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn("rounded px-2.5 py-1 text-xs hover:bg-muted", mode === value && "bg-muted font-medium")}
            >
              {t(`modes.${value}`)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {message && (
            <span role="status" className="text-xs text-muted-foreground">
              {message}
            </span>
          )}
          <input
            ref={picker}
            type="file"
            hidden
            data-testid="bibliography-file"
            accept=".bib,.bibtex,.json,.yml,.yaml,.txt"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" title={t("importHint")} onClick={() => picker.current?.click()}>
            <UploadIcon aria-hidden="true" />
            {t("import")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setMode("manager");
              setStartKey("");
            }}
          >
            <PlusIcon aria-hidden="true" />
            {t("add")}
          </Button>
        </div>
      </div>

      {(problems.length > 0 || view.unknown.length > 0) && (
        <div role="region" aria-label={t("problems.title")} className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <ul className="grid gap-1">
            {problems.map((text) => (
              <li key={text} className="flex items-center gap-2">
                <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
                {text}
              </li>
            ))}
            {view.unknown.length > 0 && (
              <li className="flex flex-wrap items-center gap-2">
                <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
                <span>{t("problems.unknown", { keys: "" })}</span>
                {view.unknown.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="rounded border border-amber-400 px-1.5 py-0.5 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    onClick={() => {
                      setMode("manager");
                      setStartKey(key);
                    }}
                  >
                    {t("problems.createFrom", { key })}
                  </button>
                ))}
              </li>
            )}
          </ul>
        </div>
      )}

      {mode === "manager" ? (
        <BibliographyManager
          documents={documents}
          onOpenDocument={onOpenDocument}
          startKey={startKey}
          onStartConsumed={() => setStartKey(null)}
        />
      ) : (
        <BibliographySource />
      )}
    </div>
  );
}
