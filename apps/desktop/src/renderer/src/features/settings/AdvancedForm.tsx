import { RotateCcwIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
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
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { AdvancedState } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { NumberField, SettingsHeading, SettingsRow } from "./fields";

const GROUP_ORDER: AdvancedGroup[] = ["page", "text", "numbering", "captions", "headings", "pageNumber", "crossRef", "outline", "bibliography"];
const FOLLOW = "__follow__";

type Props = { onSaved?: () => void };

function display(value: AdvancedValue | undefined): string {
  return Array.isArray(value) ? value.join(", ") : value === undefined ? "" : String(value);
}

/** The format of the thesis beyond the basic form, every field falls back to the school format. */
export function AdvancedForm({ onSaved }: Props) {
  const { t } = useTranslation("settings");
  const { t: tRoot } = useTranslation();
  const [state, setState] = useState<AdvancedState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.invoke(IpcChannel.ConfigGetAdvanced).then(setState).catch((e: unknown) => setError(errorMessage(tRoot, e)));
    // Loaded once when the section opens
  }, []);

  async function save(path: string, value: AdvancedValue | null): Promise<void> {
    try {
      setError(null);
      setState(await api.invoke(IpcChannel.ConfigSetAdvanced, { values: { [path]: value } }));
      onSaved?.();
    } catch (e) {
      setError(errorMessage(tRoot, e));
    }
  }

  if (error && !state) {
    return (
      <p role="alert" className="text-sm text-destructive select-text">
        {error}
      </p>
    );
  }
  if (!state) return null;
  const { values, inherited } = state;

  function control(field: AdvancedField, current: AdvancedValue | undefined, fallback: AdvancedValue | undefined, label: string): React.ReactNode {
    const set = (value: AdvancedValue | null) => void save(field.path, value);
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
      case "list":
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
                {fallback !== undefined ? ` · ${t(`option.${String(fallback)}`, { defaultValue: String(fallback) })}` : ""}
              </SelectItem>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`option.${option}`, { defaultValue: option })}
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
                      {t(`option.${option}`, { defaultValue: option })}
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
      {GROUP_ORDER.map((group) => (
        <Fragment key={group}>
          <SettingsHeading>{t(`group.${group}`)}</SettingsHeading>
          {ADVANCED_FIELDS.filter((field) => field.group === group).map((field) => {
            const label = t(`field.${field.path}`);
            const hint = t(`hint.${field.path}`, { defaultValue: "" });
            const current = values[field.path];
            return (
              <SettingsRow
                key={field.path}
                label={label}
                hint={hint || undefined}
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
