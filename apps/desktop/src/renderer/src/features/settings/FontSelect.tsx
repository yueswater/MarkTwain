import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FontSource } from "../../../../shared/ipc";
import { useFonts } from "../fonts/use-fonts";

const ORDER: FontSource[] = ["project", "template", "system"];
const FOLLOW = "__follow__";

type Props = {
  label: string;
  /** The list the thesis uses now, from the setting or else from the default */
  effective: string[];
  /** Whether the setting is written, or else it follows the default */
  written: boolean;
  onChange: (list: string[] | null) => void;
};

/** A selector of the fonts that can be used, the one that is chosen goes first and the fonts behind it stay as the fallback. */
export function FontSelect({ label, effective, written, onChange }: Props) {
  const { t } = useTranslation("settings");
  const { view } = useFonts();
  const known = new Set(view.families.map((family) => family.name.toLowerCase()));
  const groups = ORDER.map((source) => ({ source, families: view.families.filter((family) => family.source === source) })).filter((group) => group.families.length > 0);
  const first = effective[0] ?? "";
  const unlisted = first !== "" && !known.has(first.toLowerCase());
  return (
    <Select
      value={written && first !== "" ? first : FOLLOW}
      onValueChange={(name) => onChange(name === FOLLOW ? null : [name, ...effective.filter((item) => item.toLowerCase() !== name.toLowerCase())])}
    >
      <SelectTrigger aria-label={label} size="sm" className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={FOLLOW}>
          {t("followDefault")}
          {first !== "" && !written ? ` · ${first}` : ""}
        </SelectItem>
        {written && unlisted && <SelectItem value={first}>{first}</SelectItem>}
        {groups.map((group) => (
          <div key={group.source}>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{t(`fonts.sources.${group.source}`)}</SelectLabel>
              {group.families.map((family) => (
                <SelectItem key={family.name} value={family.name}>
                  {family.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
