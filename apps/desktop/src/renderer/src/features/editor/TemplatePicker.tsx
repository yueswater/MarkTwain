import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { TemplateField, TemplateLanguage, TemplateSummary } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { TablePreview } from "./TablePreview";

type Props = {
  /** Called with the Markdown of the table that the picked template builds, null while nothing is picked */
  onChange: (markdown: string | null) => void;
};

type Values = Record<string, number | boolean>;

/** The templates by field of study, with a search, the parameters of the one that is chosen and a drawing of its table. */
export function TemplatePicker({ onChange }: Props) {
  const { t, i18n } = useTranslation("editor");
  const language: TemplateLanguage = i18n.language.startsWith("zh") ? "zh-Hant" : "en";
  const [fields, setFields] = useState<TemplateField[] | null>(null);
  const [field, setField] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<TemplateSummary | null>(null);
  const [values, setValues] = useState<Values>({});
  const [markdown, setMarkdown] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.TableTemplateList, { language })
      .then((list) => !cancelled && setFields(list))
      .catch(() => !cancelled && setFields([]));
    return () => {
      cancelled = true;
    };
  }, [language]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (fields ?? [])
      .filter((entry) => field === "all" || entry.id === field)
      .flatMap((entry) => entry.templates)
      .filter((template) => needle === "" || [template.title, template.description, ...template.tags].some((text) => text.toLowerCase().includes(needle)));
  }, [fields, field, query]);

  function choose(template: TemplateSummary): void {
    setPicked(template);
    setValues(Object.fromEntries(Object.entries(template.params).map(([name, param]) => [name, param.default])));
  }

  // The table is built again whenever the template or a parameter changes
  useEffect(() => {
    if (!picked) {
      setMarkdown(null);
      onChange(null);
      return;
    }
    let cancelled = false;
    api
      .invoke(IpcChannel.TableTemplateBuild, { id: picked.id, language, params: values })
      .then((built) => {
        if (cancelled) return;
        setMarkdown(built);
        onChange(built);
      })
      .catch(() => !cancelled && onChange(null));
    return () => {
      cancelled = true;
    };
    // The callback of the parent does not change what is built
  }, [picked, values, language]);

  return (
    <div className="grid h-[min(34rem,62vh)] gap-3 sm:grid-cols-[11rem_15rem_1fr]" data-testid="template-picker">
      <div className="grid min-h-0 content-start gap-2 overflow-y-auto">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("tableTemplates.search")} aria-label={t("tableTemplates.search")} className="h-8" />
        <div role="tablist" aria-label={t("tableTemplates.fields")} aria-orientation="vertical" className="grid gap-0.5">
          {[{ id: "all", name: t("tableTemplates.all") }, ...(fields ?? [])].map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={field === entry.id}
              onClick={() => setField(entry.id)}
              className={cn("rounded-md px-2 py-1 text-left text-sm", field === entry.id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60")}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid min-h-0 content-start gap-1 overflow-y-auto sm:border-x sm:px-3" aria-label={t("tableTemplates.list")}>
        {fields !== null && shown.length === 0 && <li className="text-sm text-muted-foreground">{t("tableTemplates.none")}</li>}
        {shown.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              aria-pressed={picked?.id === template.id}
              onClick={() => choose(template)}
              className={cn("w-full rounded-md border px-2.5 py-1.5 text-left text-sm", picked?.id === template.id ? "border-foreground bg-muted/60" : "hover:bg-muted/40")}
            >
              <span className="font-medium">{template.title}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="grid min-h-0 content-start gap-3 overflow-y-auto">
        {picked ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">{picked.description}</p>
            <div className="flex flex-wrap items-end gap-4">
              {Object.entries(picked.params).map(([name, param]) =>
                param.type === "int" ? (
                  <div key={name} className="grid gap-1">
                    <Label htmlFor={`template-${name}`} className="text-xs">
                      {param.label}
                    </Label>
                    <Input
                      id={`template-${name}`}
                      type="number"
                      min={param.min}
                      max={param.max}
                      value={Number(values[name] ?? param.default)}
                      className="h-8 w-20"
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next)) setValues((current) => ({ ...current, [name]: Math.min(param.max, Math.max(param.min, Math.round(next))) }));
                      }}
                    />
                  </div>
                ) : (
                  <label key={name} className="flex items-center gap-2 text-xs">
                    <Switch checked={Boolean(values[name] ?? param.default)} aria-label={param.label} onCheckedChange={(checked) => setValues((current) => ({ ...current, [name]: checked }))} />
                    {param.label}
                  </label>
                ),
              )}
            </div>
            {picked.needs.length > 0 && <p className="text-xs text-muted-foreground">{t("tableTemplates.needs", { what: picked.needs.join("、") })}</p>}
            {markdown && <TablePreview markdown={markdown} />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("tableTemplates.choose")}</p>
        )}
      </div>
    </div>
  );
}
