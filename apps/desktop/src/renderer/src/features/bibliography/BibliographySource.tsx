import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
      <div className="flex items-baseline gap-3">
        <Label htmlFor="bib-source">{t("source.label")}</Label>
        <span className="text-xs text-muted-foreground">{t("source.hint")}</span>
        <span role="status" className="ml-auto text-xs text-muted-foreground">
          {state === "saving" ? t("source.saving") : t("source.saved")}
        </span>
      </div>
      <Textarea
        id="bib-source"
        value={value}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none font-mono text-sm"
        onChange={(event) => {
          setValue(event.target.value);
          setState("saving");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
        }}
        onBlur={() => timer.current && void flush()}
      />
    </div>
  );
}
