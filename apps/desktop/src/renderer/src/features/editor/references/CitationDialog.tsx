import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBibliography } from "../../bibliography/bibliography-context";
import { AtomDialogFrame, type Common } from "./AtomDialogFrame";
import type { AtomTarget } from "./atom-target";

const CITATION_FORMS = ["paren", "prose", "year", "author"] as const;

/** Splits "wang2020, lee2019" into a list of keys. */
export function parseCitationKeys(input: string): string[] {
  return input.split(/[,;，；\s]+/).filter(Boolean);
}

export function CitationDialog({
  target,
  onSubmit,
  ...common
}: Common & {
  target: Extract<AtomTarget, { type: "citation" }>;
  onSubmit: (keys: string[], form: string) => void;
}) {
  const { t } = useTranslation("editor");
  const { view } = useBibliography();
  const [keys, setKeys] = useState<string[]>(target.keys);
  const [form, setForm] = useState(target.form);
  const [filter, setFilter] = useState("");
  const editing = target.pos !== null;

  const known = new Set(view.items.map((item) => item.key));
  const typed = keys.filter((key) => !known.has(key)).join(", ");
  const needle = filter.trim().toLowerCase();
  const shown = view.items.filter(
    (item) => needle === "" || `${item.key} ${item.label} ${item.fields.title ?? ""}`.toLowerCase().includes(needle),
  );
  const toggle = (key: string) => setKeys((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <AtomDialogFrame
      title={t(editing ? "citation.editTitle" : "citation.insertTitle")}
      editing={editing}
      canSubmit={keys.length > 0}
      onSubmit={() => onSubmit(keys, form)}
      {...common}
    >
      <div className="grid gap-2">
        <Label htmlFor="citation-filter">{t("citation.pick")}</Label>
        {view.items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{t("citation.noBibliography")}</p>
        ) : (
          <>
            <Input
              id="citation-filter"
              value={filter}
              autoFocus
              placeholder={t("citation.filter")}
              spellCheck={false}
              onChange={(event) => setFilter(event.target.value)}
            />
            <ul className="max-h-48 overflow-y-auto rounded-md border" aria-label={t("citation.pick")}>
              {shown.length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("citation.noMatch")}</li>}
              {shown.map((item) => (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm hover:bg-muted">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={keys.includes(item.key)}
                      onChange={() => toggle(item.key)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.key}
                        {item.fields.title ? ` · ${item.fields.title}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="citation-keys">{t("citation.keys")}</Label>
        <Input
          id="citation-keys"
          value={typed}
          autoFocus={view.items.length === 0}
          spellCheck={false}
          onChange={(event) => setKeys([...keys.filter((key) => known.has(key)), ...parseCitationKeys(event.target.value)])}
        />
        <p className="text-xs text-muted-foreground">{t("citation.keysHint")}</p>
      </div>
      <div className="grid gap-2">
        <Label>{t("citation.form")}</Label>
        <Select value={form} onValueChange={setForm}>
          <SelectTrigger aria-label={t("citation.form")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITATION_FORMS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`citation.forms.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </AtomDialogFrame>
  );
}
