import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { tokenizeBibtex } from "./bib-highlight";
import { useBibliography } from "./bibliography-context";

const SAVE_DELAY_MS = 600;

/** The BibTeX source of the project, saved while typing. */
export function BibliographySource() {
  const { t } = useTranslation("bibliography");
  const { view, setText } = useBibliography();
  const [value, setValue] = useState(view.text);
  const [state, setState] = useState<"saved" | "saving">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  // The text can change from the manager while this view is closed, take it again when it is shown
  useEffect(() => {
    if (state === "saved") setValue(view.text);
    // Only a saved state may be overwritten, what is being typed stays
  }, [view.text]);

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    await setText(latest.current);
    setState("saved");
  };

  // Leaving the view saves what is still waiting
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void setText(latest.current);
      }
    },
    [],
  );

  const tokens = useMemo(() => tokenizeBibtex(value), [value]);
  const lineCount = value.split("\n").length;
  const errorLines = useMemo(() => new Set(view.errors.map((error) => error.line)), [view.errors]);
  const back = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
      <div className="flex items-baseline gap-3">
        <Label htmlFor="bib-source">{t("source.label")}</Label>
        <span className="text-xs text-muted-foreground">{t("source.hint")}</span>
        <span role="status" className="ml-auto text-xs text-muted-foreground">
          {state === "saving" ? t("source.saving") : t("source.saved")}
        </span>
      </div>
      <div className="bib-source flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background font-mono text-sm leading-6">
        <div ref={gutter} aria-hidden="true" className="select-none overflow-hidden border-r bg-muted/40 px-2 py-2 text-right text-xs leading-6 text-muted-foreground" data-testid="bib-gutter">
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index} className={errorLines.has(index + 1) ? "font-semibold text-destructive" : undefined} data-error={errorLines.has(index + 1) || undefined}>
              {index + 1}
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <pre ref={back} aria-hidden="true" data-testid="bib-highlight" className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre p-2 leading-6">
            {tokens.map((token, index) => (
              <span key={index} className={`bib-${token.kind}`}>
                {token.text}
              </span>
            ))}
            {"\n"}
          </pre>
          <textarea
            id="bib-source"
            aria-label={t("source.label")}
            value={value}
            spellCheck={false}
            wrap="off"
            className="absolute inset-0 m-0 h-full w-full resize-none overflow-auto whitespace-pre border-0 bg-transparent p-2 leading-6 text-transparent caret-foreground outline-none selection:bg-primary/20"
            onScroll={(event) => {
              const el = event.currentTarget;
              if (back.current) {
                back.current.scrollTop = el.scrollTop;
                back.current.scrollLeft = el.scrollLeft;
              }
              if (gutter.current) gutter.current.scrollTop = el.scrollTop;
            }}
            onChange={(event) => {
              setValue(event.target.value);
              setState("saving");
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
            }}
            onBlur={() => timer.current && void flush()}
          />
        </div>
      </div>
    </div>
  );
}
