import { CaseSensitiveIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { DocumentSummary, SearchHit } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { documentTitle } from "./sidebar/document-title";
import { Rich } from "../../shared/rich";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: DocumentSummary[];
  /** Saves what is being typed so the search sees it */
  beforeSearch: () => Promise<void>;
  onOpenHit: (hit: SearchHit, term: string) => void;
};

/** Search in the whole project, the hits are listed by document and a click opens the place. */
export function SearchDialog({ open, onOpenChange, documents, beforeSearch, onOpenHit }: Props) {
  const { t } = useTranslation("project");
  const { t: tRoot } = useTranslation();
  const [term, setTerm] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [result, setResult] = useState<{ hits: SearchHit[]; truncated: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  useEffect(() => {
    if (!open) return;
    const query = term.trim();
    if (query === "") {
      setResult(null);
      return;
    }
    const ticket = ++run.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await beforeSearch();
          const found = await api.invoke(IpcChannel.SearchQuery, { text: query, caseSensitive });
          if (ticket === run.current) {
            setResult(found);
            setError(null);
          }
        } catch (e) {
          if (ticket === run.current) setError(errorMessage(tRoot, e));
        }
      })();
    }, 200);
    return () => clearTimeout(timer);
    // beforeSearch changes with the editor, the search should not restart for it
  }, [open, term, caseSensitive]);

  const title = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    return doc ? documentTitle(t, doc) : id;
  };
  const groups = new Map<string, SearchHit[]>();
  for (const hit of result?.hits ?? []) groups.set(hit.documentId, [...(groups.get(hit.documentId) ?? []), hit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-3 sm:max-w-2xl" showCloseButton>
        <DialogTitle>{t("search.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("search.description")}</DialogDescription>
        <div className="flex items-center gap-2">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            value={term}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            onChange={(event) => setTerm(event.target.value)}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("search.caseSensitive")}
            title={t("search.caseSensitive")}
            aria-pressed={caseSensitive}
            className={cn(caseSensitive && "bg-muted")}
            onClick={() => setCaseSensitive((value) => !value)}
          >
            <CaseSensitiveIcon aria-hidden="true" />
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            <Rich text={error} />
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          {result && result.hits.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("search.none")}</p>}
          {[...groups.entries()].map(([id, hits]) => (
            <section key={id} className="mb-3" aria-label={title(id)}>
              <h3 className="px-1 pb-1 text-xs font-medium text-muted-foreground">
                {title(id)} · {t("search.count", { count: hits.length })}
              </h3>
              <ul>
                {hits.map((hit, index) => (
                  <li key={`${hit.block}-${index}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenHit(hit, term.trim());
                        onOpenChange(false);
                      }}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span className="text-muted-foreground">{hit.before}</span>
                      <mark className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-700">{hit.match}</mark>
                      <span className="text-muted-foreground">{hit.after}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {result?.truncated && <p className="pt-2 text-center text-xs text-muted-foreground">{t("search.truncated")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
