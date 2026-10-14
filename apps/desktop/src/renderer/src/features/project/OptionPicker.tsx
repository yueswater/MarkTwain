import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CUSTOM = "__custom__";

export type PickerOption = { zh: string; en: string };

type Props = {
  id: string;
  label: string;
  placeholder: string;
  options: PickerOption[];
  /** Chinese name currently stored, empty when none */
  zh: string;
  en: string;
  english: boolean;
  onChange: (value: PickerOption) => void;
};

/**
 * A list of known names with an escape hatch to type your own.
 * Picking from the list fills in both the Chinese and the English name.
 */
export function OptionPicker({ id, label, placeholder, options, zh, en, english, onChange }: Props) {
  const { t } = useTranslation("config");
  const known = options.some((option) => option.zh === zh);
  // A stored name that is not in the list is shown as typed in
  const [custom, setCustom] = useState(zh !== "" && !known);
  const showCustom = custom || (zh !== "" && !known);

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Select
          value={showCustom ? CUSTOM : known ? zh : ""}
          onValueChange={(value) => {
            if (value === CUSTOM) {
              setCustom(true);
              return;
            }
            setCustom(false);
            const picked = options.find((option) => option.zh === value);
            if (picked) onChange(picked);
          }}
        >
          <SelectTrigger id={id} aria-label={label} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.zh} value={option.zh}>
                {english && option.en ? option.en : option.zh}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>{t("custom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showCustom && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-zh`}>{t("customZh")}</Label>
            <Input id={`${id}-zh`} value={zh} onChange={(event) => onChange({ zh: event.target.value, en })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-en`}>{t("customEn")}</Label>
            <Input id={`${id}-en`} value={en} onChange={(event) => onChange({ zh, en: event.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
