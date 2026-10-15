import { PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BULLET_SYMBOLS,
  LIST_PRESETS,
  ORDERED_STYLES,
  bulletSymbol,
  formatOrdered,
  levelAt,
  resolveListLevels,
  type AdvancedValue,
} from "@marktwain/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdvancedState } from "../../../../../shared/ipc/index";
import { SettingsHeading, SettingsRow } from "../controls/fields";

type Props = {
  state: AdvancedState | null;
  /** Saves one setting, null goes back to what the template gives */
  onSave: (path: string, value: AdvancedValue | null) => Promise<void>;
};

type Kind = "ordered" | "bullet";

/** What the template draws when nothing is chosen, shown in the preview. */
const TEMPLATE_ORDERED = ["decimal"];
const TEMPLATE_BULLETS = ["•", "‣", "–"];

const same = (a: readonly string[] | null | undefined, b: readonly string[] | null | undefined) => (a ?? []).join("\n") === (b ?? []).join("\n");

/** A nested list of four levels drawn with the markers, so the choice can be seen before it is saved. */
function Preview({ kind, levels }: { kind: Kind; levels: string[] }) {
  const { t } = useTranslation("settings");
  const marker = (depth: number, item: number): string => {
    if (kind === "ordered") return levels.length > 0 ? formatOrdered(levelAt(levels, depth) as string, item) : formatOrdered(TEMPLATE_ORDERED[0] as string, item);
    return levels.length > 0 ? bulletSymbol(levelAt(levels, depth) as string) : (levelAt(TEMPLATE_BULLETS, depth) as string);
  };
  return (
    <ul aria-label={t("lists.preview")} className="mt-2 rounded-md border bg-white p-3 text-sm text-black" data-testid={`list-preview-${kind}`}>
      {[1, 2, 3, 4, 5].map((depth) => (
        <li key={depth} className="flex gap-2 leading-6" style={{ paddingLeft: (depth - 1) * 20 }}>
          <span className="w-9 shrink-0 text-right tabular-nums">{marker(depth, depth === 3 ? 2 : 1)}</span>
          <span>{t("lists.sample", { n: depth })}</span>
        </li>
      ))}
    </ul>
  );
}

/** The levels of one kind of list, a choice for each level with an example next to its name. */
function Levels({ kind, levels, onChange }: { kind: Kind; levels: string[]; onChange: (next: string[]) => void }) {
  const { t } = useTranslation("settings");
  const options = kind === "ordered" ? ORDERED_STYLES.map((style) => style.id) : BULLET_SYMBOLS.map((symbol) => symbol.id);
  const example = (id: string) => (kind === "ordered" ? [1, 2, 3].map((n) => formatOrdered(id, n)).join(" ") : bulletSymbol(id));
  const name = (id: string) => t(kind === "ordered" ? `lists.styles.${id}` : `lists.symbols.${id}`);
  const next = options.find((id) => id !== levels.at(-1)) ?? (options[0] as string);
  return (
    <div className="grid gap-1.5">
      {levels.length === 0 && <p className="text-sm text-muted-foreground">{t("lists.usesTemplate")}</p>}
      {levels.map((id, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-sm text-muted-foreground">{t("lists.level", { n: index + 1 })}</span>
          <Select value={id} onValueChange={(value) => onChange(levels.map((level, i) => (i === index ? value : level)))}>
            <SelectTrigger size="sm" aria-label={`${t(`lists.${kind}`)} ${t("lists.level", { n: index + 1 })}`} className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  <span className="inline-block min-w-24 tabular-nums">{example(option)}</span>
                  <span className="text-muted-foreground">{name(option)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("lists.removeLevel", { n: index + 1 })} onClick={() => onChange(levels.filter((_, i) => i !== index))}>
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...levels, next])}>
          <PlusIcon aria-hidden="true" />
          {t("lists.addLevel")}
        </Button>
        {levels.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
            <RotateCcwIcon aria-hidden="true" />
            {t("lists.reset")}
          </Button>
        )}
      </div>
      <Preview kind={kind} levels={levels} />
    </div>
  );
}

/** The markers of the levels of ordered and bullet lists, chosen from presets or level by level. They are part of the thesis because they change the PDF. */
export function ListSettings({ state, onSave }: Props) {
  const { t } = useTranslation("settings");
  const chosen = resolveListLevels({ ordered: state?.values["lists.ordered"], bullet: state?.values["lists.bullet"] });
  const ordered = chosen.ordered ?? [];
  const bullet = chosen.bullet ?? [];
  const preset = LIST_PRESETS.find((p) => same(p.levels?.ordered, ordered) && same(p.levels?.bullet, bullet))?.id ?? "custom";

  const save = (kind: Kind, levels: string[]) => onSave(`lists.${kind}`, levels.length > 0 ? levels : null);

  return (
    <div>
      <SettingsRow
        id="setting-lists-preset"
        label={t("lists.preset")}
        hint={t("lists.presetHint")}
        control={
          <Select
            value={preset}
            onValueChange={(id) => {
              const found = LIST_PRESETS.find((p) => p.id === id);
              if (!found) return;
              void save("ordered", found.levels?.ordered ?? []).then(() => save("bullet", found.levels?.bullet ?? []));
            }}
          >
            <SelectTrigger size="sm" aria-label={t("lists.preset")} className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIST_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {t(`lists.presets.${p.id}`)}
                </SelectItem>
              ))}
              {preset === "custom" && <SelectItem value="custom">{t("lists.presets.custom")}</SelectItem>}
            </SelectContent>
          </Select>
        }
      />
      <SettingsHeading>{t("lists.ordered")}</SettingsHeading>
      <div id="setting-lists.ordered">
        <Levels kind="ordered" levels={ordered} onChange={(next) => void save("ordered", next)} />
      </div>
      <SettingsHeading>{t("lists.bullet")}</SettingsHeading>
      <div id="setting-lists.bullet">
        <Levels kind="bullet" levels={bullet} onChange={(next) => void save("bullet", next)} />
      </div>
    </div>
  );
}
