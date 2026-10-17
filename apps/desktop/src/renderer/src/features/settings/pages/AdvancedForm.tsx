import { RotateCcwIcon } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ADVANCED_FIELDS, isValidAdvanced, type AdvancedField, type AdvancedGroup, type AdvancedValue, type AdvancedValues } from "@marktwain/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import type { AdvancedState } from "../../../../../shared/ipc/index";
import { LABELS_CHANGED } from "../../editor/references/use-label-index";
import { api } from "../../../shared/api";
import { errorMessage } from "../../../shared/error-message";
import { FontSelect } from "../controls/FontSelect";
import { NumberField, SettingsHeading, SettingsRow } from "../controls/fields";
import { CaptionPicker, HeadingsPreview, OutlinePreview, PageDiagram, PatternInput, TitlePreview, UncitedPreview, WithExample } from "../controls/SettingsIllustrations";
import { perChapterExample, type Margins } from "../settings-previews";

const FOLLOW = "__follow__";

type Props = {
  /** The groups of settings this page shows, in order */
  groups: readonly AdvancedGroup[];
  state: AdvancedState | null;
  error: string | null;
  /** Saves one setting, a null value goes back to the inherited one */
  onSave: (path: string, value: AdvancedValue | null) => Promise<void>;
};

/** Loads the format settings of the open project, shared by the pages and the page list of the settings window. */
export function useAdvancedState(enabled: boolean, onSaved?: () => void) {
  const { t: tRoot } = useTranslation();
  const [state, setState] = useState<AdvancedState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.invoke(IpcChannel.ConfigGetAdvanced).then(setState).catch((e: unknown) => setError(errorMessage(tRoot, e)));
  }, [tRoot]);

  useEffect(() => {
    if (enabled) reload();
    // Loaded again each time the window opens
  }, [enabled, reload]);

  async function save(path: string, value: AdvancedValue | null): Promise<void> {
    try {
      setError(null);
      setState(await api.invoke(IpcChannel.ConfigSetAdvanced, { values: { [path]: value } }));
      // The editor draws captions and numbers from these settings
      window.dispatchEvent(new Event(LABELS_CHANGED));
      onSaved?.();
    } catch (e) {
      setError(errorMessage(tRoot, e));
    }
  }

  return { state, error, save, reload };
}

function display(value: AdvancedValue | undefined): string {
  return Array.isArray(value) ? value.join(", ") : value === undefined ? "" : String(value);
}

/** The format of the thesis beyond the basic form, every field falls back to the school format. */
export function AdvancedForm({ groups, state, error, onSave }: Props) {
  const { t } = useTranslation("settings");
  const save = onSave;
  // The rules of the school name the list at the front of the thesis, 目次 or 目錄
  const toc = state?.terms.toc ?? "目次";

  if (error && !state) {
    return (
      <p role="alert" className="text-sm text-destructive select-text">
        {error}
      </p>
    );
  }
  if (!state) return null;
  const { values, inherited } = state;
  /** The value that applies, the setting of the thesis or the one it inherits */
  const effective = (path: string): AdvancedValue | undefined => values[path] ?? inherited[path];
  const effectiveNumber = (path: string, fallback: number): number => {
    const value = effective(path);
    return typeof value === "number" ? value : fallback;
  };
  const effectiveText = (path: string, fallback: string): string => {
    const value = effective(path);
    return typeof value === "string" ? value : fallback;
  };

  function control(field: AdvancedField, current: AdvancedValue | undefined, fallback: AdvancedValue | undefined, label: string): React.ReactNode {
    const set = (value: AdvancedValue | null) => void save(field.path, value);
    // Settings that look like something get a picture or an example, the others are plain controls
    if (field.path.startsWith("layout.caption-position.")) {
      return <CaptionPicker value={(current ?? fallback) === "top" ? "top" : "bottom"} label={label} onChange={(value) => set(value)} />;
    }
    if (field.path.startsWith("cross-ref.")) {
      return <PatternInput label={label} value={typeof current === "string" ? current : ""} placeholder={display(fallback)} onCommit={(v) => set(v === "" ? null : v)} />;
    }
    if (field.path === "layout.footnote-per-chapter" || field.path === "layout.equation-per-chapter") {
      const kind = field.path === "layout.footnote-per-chapter" ? "footnote" : "equation";
      const on = typeof current === "boolean" ? current : fallback === true;
      const style = effectiveText(kind === "footnote" ? "layout.footnote-numbering" : "layout.equation-numbering", "1");
      return (
        <WithExample example={perChapterExample(kind, on, style)}>
          <Switch aria-label={label} checked={on} onCheckedChange={(checked) => set(checked)} />
        </WithExample>
      );
    }
    // A group may name an option on its own, the top of a page is not the top of a caption
    const optionName = (option: string) => t(`option.${field.group}.${option}`, { defaultValue: t(`option.${option}`, { defaultValue: option }) });
    switch (field.kind) {
      case "number":
        return (
          <NumberField
            label={label}
            value={typeof current === "number" ? current : null}
            placeholder={display(fallback) || undefined}
            min={field.min}
            max={field.max}
            unit={field.unit ? t(`units.${field.unit}`) : undefined}
            onCommit={set}
          />
        );
      case "text":
        return <TextControl label={label} value={typeof current === "string" ? current : ""} placeholder={display(fallback)} onCommit={(v) => set(v === "" ? null : v)} />;
      case "list": {
        // The font names are chosen from the fonts that exist, other lists are written as text
        if (field.path === "layout.font-latin" || field.path === "layout.font-cjk") {
          const effective = (Array.isArray(current) ? current : Array.isArray(fallback) ? fallback : []) as string[];
          return <FontSelect label={label} effective={effective} written={Array.isArray(current)} onChange={set} />;
        }
        return (
          <TextControl
            label={label}
            wide
            value={Array.isArray(current) ? current.join(", ") : ""}
            placeholder={display(fallback)}
            onCommit={(v) => {
              const list = v.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
              set(list.length === 0 ? null : list);
            }}
          />
        );
      }
      case "bool":
        return <Switch aria-label={label} checked={typeof current === "boolean" ? current : fallback === true} onCheckedChange={(checked) => set(checked)} />;
      case "select":
        return (
          <Select value={typeof current === "string" ? current : FOLLOW} onValueChange={(value) => set(value === FOLLOW ? null : value)}>
            <SelectTrigger aria-label={label} size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FOLLOW}>
                {t("followDefault")}
                {fallback !== undefined ? ` · ${optionName(String(fallback))}` : ""}
              </SelectItem>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {optionName(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "numbers4": {
        const base = (Array.isArray(current) ? current : Array.isArray(fallback) ? fallback : []) as number[];
        return (
          <span className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <NumberField
                key={i}
                label={`${label} ${t("levels", { n: i + 1 })}`}
                value={base[i] ?? null}
                min={field.min}
                max={field.max}
                className="w-14"
                onCommit={(n) => {
                  const next = [0, 1, 2, 3].map((j) => (j === i ? n : (base[j] ?? null)));
                  if (next.every((x): x is number => typeof x === "number")) set(next);
                }}
              />
            ))}
          </span>
        );
      }
      case "select4": {
        const base = (Array.isArray(current) ? current : Array.isArray(fallback) ? fallback : []) as string[];
        return (
          <span className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Select
                key={i}
                value={base[i] ?? (field.options ?? [])[0] ?? ""}
                onValueChange={(value) => {
                  const next = [0, 1, 2, 3].map((j) => (j === i ? value : (base[j] ?? (field.options ?? [])[0] ?? "")));
                  set(next);
                }}
              >
                <SelectTrigger aria-label={`${label} ${t("levels", { n: i + 1 })}`} size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option} value={option}>
                      {optionName(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </span>
        );
      }
    }
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">{t("advancedHint")}</p>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive select-text">
          {error}
        </p>
      )}
      {groups.map((group) => (
        <Fragment key={group}>
          <SettingsHeading>{t(`group.${group}`, { toc })}</SettingsHeading>
          {group === "headings" && (
            <HeadingsPreview
              sizes={(Array.isArray(effective("layout.heading.size")) ? effective("layout.heading.size") : [18, 16, 14, 12]) as number[]}
              aligns={(Array.isArray(effective("layout.heading.align")) ? effective("layout.heading.align") : ["center", "center", "left", "left"]) as string[]}
              lineHeight={effectiveNumber("layout.heading.line-height", 1.2)}
            />
          )}
          {group === "outline" && <OutlinePreview depth={effectiveNumber("outline.depth", 3)} toc={toc} />}
          {ADVANCED_FIELDS.filter((field) => field.group === group && !field.path.startsWith("layout.margin.")).map((field) => {
            const label = t(`field.${field.path}`, { toc });
            const hint = t(`hint.${field.path}`, { defaultValue: "", toc });
            const current = values[field.path];
            const row = (
              <SettingsRow
                key={field.path}
                id={`setting-${field.path}`}
                label={label}
                hint={hint || undefined}
                below={
                  field.path === "bibliography.title" ? <TitlePreview title={effectiveText("bibliography.title", "")} /> : field.path === "bibliography.full" ? <UncitedPreview listAll={effective("bibliography.full") === true} /> : undefined
                }
                control={
                  <span className="flex items-center gap-1.5">
                    {control(field, current, inherited[field.path], label)}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`${t("reset")}: ${label}`}
                      title={t("reset")}
                      className={current === undefined ? "invisible" : undefined}
                      onClick={() => void save(field.path, null)}
                    >
                      <RotateCcwIcon aria-hidden="true" />
                    </Button>
                  </span>
                }
              />
            );
            // The drawing of the page comes right after the paper size, its fields are the four margins
            if (field.path !== "layout.paper") return row;
            const margins: Margins = {
              top: effectiveNumber("layout.margin.top", 2.54),
              bottom: effectiveNumber("layout.margin.bottom", 2.54),
              left: effectiveNumber("layout.margin.left", 3.18),
              right: effectiveNumber("layout.margin.right", 3.18),
            };
            return (
              <Fragment key={field.path}>
                {row}
                <PageDiagram
                  paper={effectiveText("layout.paper", "a4")}
                  margins={margins}
                  overridden={new Set((["top", "bottom", "left", "right"] as const).filter((side) => values[`layout.margin.${side}`] !== undefined))}
                  onCommit={(side, value) => void save(`layout.margin.${side}`, value)}
                  label={(side) => t(`field.layout.margin.${side}`)}
                />
              </Fragment>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function TextControl({ label, value, placeholder, wide, onCommit }: { label: string; value: string; placeholder?: string; wide?: boolean; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Input
      aria-label={label}
      value={text}
      placeholder={placeholder}
      className={wide ? "h-8 w-72 px-2 text-sm md:text-sm" : "h-8 w-52 px-2 text-sm md:text-sm"}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => text !== value && onCommit(text)}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
    />
  );
}

// Re-exported for tests of the validation that the controls rely on
export { isValidAdvanced };
export type { AdvancedValues };
