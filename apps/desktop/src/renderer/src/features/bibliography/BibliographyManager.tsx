import { ENTRY_TYPES } from "@marktwain/schema";
import { SearchIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BibEntryInput, BibItem, DocumentSummary } from "../../../../shared/ipc";
import { documentTitle } from "../project/sidebar/document-title";
import { fieldsFor, requiredNames, plainTitle } from "./bib-fields";
import { useBibliography } from "./bibliography-context";
import { Rich } from "../../shared/rich";

type Draft = { originalKey: string | null; entry: BibEntryInput };

const NEW_ENTRY: BibEntryInput = { type: "article", key: "", fields: {} };

function draftOf(item: BibItem): Draft {
  return { originalKey: item.key, entry: { type: item.type, key: item.key, fields: { ...item.fields } } };
}

/** Compares what the form holds with the stored entry, empty fields count as missing. */
function sameEntry(a: BibEntryInput, b: BibEntryInput): boolean {
  const clean = (fields: Record<string, string>) =>
    JSON.stringify(Object.entries(fields).filter(([, value]) => value.trim() !== "").sort(([x], [y]) => x.localeCompare(y)));
  return a.type === b.type && a.key.trim() === b.key.trim() && clean(a.fields) === clean(b.fields);
}

type Props = {
  documents: DocumentSummary[];
  onOpenDocument: (id: string) => void;
  /** A key to start a new entry from, set when the user picks an unknown key of the problem list */
  startKey: string | null;
  onStartConsumed: () => void;
};

/** List of entries on the left and the form of the selected entry on the right. */
export function BibliographyManager({ documents, onOpenDocument, startKey, onStartConsumed }: Props) {
  const { t } = useTranslation("bibliography");
  const { t: tProject } = useTranslation("project");
  const { t: tCommon } = useTranslation();
  const { view, error, upsert, remove } = useBibliography();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Starting from an unknown key opens an empty form with the key filled in
  useEffect(() => {
    if (startKey === null) return;
    setDraft({ originalKey: null, entry: { ...NEW_ENTRY, key: startKey } });
    onStartConsumed();
    // The callback only clears the request
  }, [startKey]);

  const stored = draft?.originalKey ? (view.items.find((item) => item.key === draft.originalKey) ?? null) : null;
  const entryDirty =
    draft !== null &&
    (stored === null
      ? draft.entry.key.trim() !== "" || Object.values(draft.entry.fields).some((value) => value.trim() !== "")
      : !sameEntry(draft.entry, { type: stored.type, key: stored.key, fields: stored.fields }));

  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      view.items.filter(
        (item) => needle === "" || `${item.key} ${item.label} ${item.fields.title ?? ""} ${item.fields.author ?? ""}`.toLowerCase().includes(needle),
      ),
    [view.items, needle],
  );

  /** Saves the open draft when it changed, returns false when saving failed and the user should stay. */
  async function commit(): Promise<boolean> {
    if (!draft || !entryDirty) return true;
    if (draft.entry.key.trim() === "") return draft.originalKey === null;
    const ok = await upsert(draft.entry, draft.originalKey);
    if (ok) {
      setDraft({ originalKey: draft.entry.key.trim(), entry: { ...draft.entry, key: draft.entry.key.trim() } });
      setJustSaved(true);
    }
    return ok;
  }

  async function select(item: BibItem | null): Promise<void> {
    if (!(await commit())) return;
    setJustSaved(false);
    setDraft(item ? draftOf(item) : { originalKey: null, entry: { ...NEW_ENTRY } });
  }

  const setField = (name: string, value: string) => {
    setJustSaved(false);
    setDraft((current) => (current ? { ...current, entry: { ...current.entry, fields: { ...current.entry.fields, [name]: value } } } : current));
  };

  const required = draft ? requiredNames(draft.entry.type) : new Set<string>();
  const citedBy = stored?.citedBy ?? [];

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="relative p-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label={t("search")}
            placeholder={t("searchPlaceholder")}
            value={query}
            spellCheck={false}
            className="pl-8"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label={t("title")}>
          {view.items.length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("empty")}</li>}
          {view.items.length > 0 && shown.length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("noMatch")}</li>}
          {shown.map((item) => {
            const count = item.citedBy.reduce((sum, c) => sum + c.count, 0);
            const current = draft?.originalKey === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => void select(item)}
                  className={cn("flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", current && "bg-muted")}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.label}</span>
                    {item.missing.length > 0 && (
                      <TriangleAlertIcon
                        className="size-3.5 shrink-0 text-amber-600"
                        aria-label={t("incomplete", { fields: item.missing.map((name) => t(`fields.${name}`, { defaultValue: name })).join(", ") })}
                      />
                    )}
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{count > 0 ? count : t("uncited")}</span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{plainTitle(item.fields.title || item.key)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t p-2 text-xs text-muted-foreground">{t("count", { count: view.items.length })}</div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {!draft ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
            <p>{t("select")}</p>
            <Button variant="outline" onClick={() => void select(null)}>
              {t("add")}
            </Button>
          </div>
        ) : (
          <form
            className="mx-auto grid max-w-2xl gap-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void commit();
            }}
          >
            <h3 className="text-base font-medium">{draft.originalKey ? draft.originalKey : t("form.newTitle")}</h3>

            <div className="grid grid-cols-[10rem_1fr] gap-4">
              <div className="grid gap-2">
                <Label>{t("form.type")}</Label>
                <Select
                  value={draft.entry.type}
                  onValueChange={(type) => {
                    setJustSaved(false);
                    setDraft({ ...draft, entry: { ...draft.entry, type } });
                  }}
                >
                  <SelectTrigger aria-label={t("form.type")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([...ENTRY_TYPES, draft.entry.type])].map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`types.${type}`, { defaultValue: type })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bib-key">{t("form.key")}</Label>
                <Input
                  id="bib-key"
                  value={draft.entry.key}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => {
                    setJustSaved(false);
                    setDraft({ ...draft, entry: { ...draft.entry, key: event.target.value } });
                  }}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground"><Rich text={t("form.keyHint")} /></p>

            {fieldsFor(draft.entry.type, draft.entry.fields).map((name) => (
              <div key={name} className="grid gap-2">
                <Label htmlFor={`bib-field-${name}`}>
                  <span>
                    {t(`fields.${name}`, { defaultValue: name })}
                    {required.has(name) && (
                      <span className="ml-0.5 text-muted-foreground" title={t("form.required")} aria-label={t("form.required")}>
                        *
                      </span>
                    )}
                  </span>
                </Label>
                <Input
                  id={`bib-field-${name}`}
                  value={draft.entry.fields[name] ?? ""}
                  spellCheck={false}
                  onChange={(event) => setField(name, event.target.value)}
                />
                {name === "author" && <p className="text-xs text-muted-foreground"><Rich text={t("authorHint")} /></p>}
              </div>
            ))}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                <Rich text={error} />
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={draft.entry.key.trim() === "" || !entryDirty}>
                {t("form.save")}
              </Button>
              {stored && entryDirty && (
                <Button type="button" variant="outline" onClick={() => setDraft(draftOf(stored))}>
                  {t("form.revert")}
                </Button>
              )}
              {justSaved && !entryDirty && (
                <span role="status" className="text-sm text-muted-foreground">
                  {t("form.saved")}
                </span>
              )}
              {stored && (
                <Button type="button" variant="ghost" className="ml-auto text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2Icon aria-hidden="true" />
                  {t("form.delete")}
                </Button>
              )}
            </div>

            {stored && (
              <section aria-label={t("citedIn")} className="grid gap-2 border-t pt-4">
                <h4 className="text-sm font-medium">{t("citedIn")}</h4>
                {citedBy.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("citedInNone")}</p>
                ) : (
                  <ul className="grid gap-1">
                    {citedBy.map((cite) => {
                      const doc = documents.find((d) => d.id === cite.documentId);
                      if (!doc) return null;
                      return (
                        <li key={cite.documentId}>
                          <button
                            type="button"
                            onClick={() => onOpenDocument(doc.id)}
                            className="flex w-full items-center rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                          >
                            <span className="truncate">{documentTitle(tProject, doc)}</span>
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t("citedTimes", { count: cite.count })}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </form>
        )}
      </div>

      {confirmDelete && stored && (
        <Dialog open onOpenChange={(open) => !open && setConfirmDelete(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteTitle")}</DialogTitle>
              <DialogDescription>{t("deleteBody", { key: stored.key })}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                {tCommon("action.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmDelete(false);
                  void remove(stored.key).then((ok) => ok && setDraft(null));
                }}
              >
                {tCommon("action.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
