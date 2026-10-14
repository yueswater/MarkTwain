import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrefs } from "@/lib/prefs";
import { PREF_LIMITS } from "../../../../shared/prefs";
import { NumberField, SettingsRow } from "./fields";

function Choice<T extends string>({ value, options, label, onChange }: { value: T; options: { value: T; label: string }[]; label: string; onChange: (value: T) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger aria-label={label} size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Preferences of the editor that most people change. */
export function EditorBasicSettings() {
  const { t } = useTranslation("settings");
  const { prefs, setPrefs } = usePrefs();
  return (
    <div>
      <SettingsRow
        label={t("editor.fontFamily")}
        hint={t("editor.fontFamilyHint")}
        control={
          <Choice
            label={t("editor.fontFamily")}
            value={prefs.fontFamily}
            options={[
              { value: "sans", label: t("editor.sans") },
              { value: "serif", label: t("editor.serif") },
            ]}
            onChange={(fontFamily) => setPrefs({ fontFamily })}
          />
        }
      />
      <SettingsRow
        label={t("editor.fontSize")}
        hint={t("editor.fontSizeHint")}
        control={<NumberField label={t("editor.fontSize")} value={prefs.fontSize} min={PREF_LIMITS.fontSize[0]} max={PREF_LIMITS.fontSize[1]} unit="px" onCommit={(v) => v !== null && setPrefs({ fontSize: v })} />}
      />
      <SettingsRow
        label={t("editor.lineHeight")}
        control={<NumberField label={t("editor.lineHeight")} value={prefs.lineHeight} min={PREF_LIMITS.lineHeight[0]} max={PREF_LIMITS.lineHeight[1]} step={0.05} onCommit={(v) => v !== null && setPrefs({ lineHeight: v })} />}
      />
      <SettingsRow
        label={t("editor.contentWidth")}
        control={
          <Choice
            label={t("editor.contentWidth")}
            value={prefs.contentWidth}
            options={[
              { value: "narrow", label: t("editor.narrow") },
              { value: "normal", label: t("editor.normal") },
              { value: "wide", label: t("editor.wide") },
            ]}
            onChange={(contentWidth) => setPrefs({ contentWidth })}
          />
        }
      />
      <SettingsRow
        label={t("editor.lineNumbers")}
        hint={t("editor.lineNumbersHint")}
        control={<Switch aria-label={t("editor.lineNumbers")} checked={prefs.lineNumbers} onCheckedChange={(lineNumbers) => setPrefs({ lineNumbers })} />}
      />
      <SettingsRow
        label={t("editor.spellcheck")}
        hint={t("editor.spellcheckHint")}
        control={<Switch aria-label={t("editor.spellcheck")} checked={prefs.spellcheck} onCheckedChange={(spellcheck) => setPrefs({ spellcheck })} />}
      />
    </div>
  );
}

/** Preferences for saving, pasting and the preview. */
export function EditorAdvancedSettings() {
  const { t } = useTranslation("settings");
  const { prefs, setPrefs } = usePrefs();
  return (
    <div>
      <SettingsRow
        label={t("editor.codeFontSize")}
        control={<NumberField label={t("editor.codeFontSize")} value={prefs.codeFontSize} min={PREF_LIMITS.codeFontSize[0]} max={PREF_LIMITS.codeFontSize[1]} unit="px" onCommit={(v) => v !== null && setPrefs({ codeFontSize: v })} />}
      />
      <SettingsRow
        label={t("editor.autosaveDelay")}
        hint={t("editor.autosaveDelayHint")}
        control={<NumberField label={t("editor.autosaveDelay")} value={prefs.autosaveDelayMs} min={PREF_LIMITS.autosaveDelayMs[0]} max={PREF_LIMITS.autosaveDelayMs[1]} unit="ms" onCommit={(v) => v !== null && setPrefs({ autosaveDelayMs: v })} />}
      />
      <SettingsRow
        label={t("editor.pasteMarkdown")}
        hint={t("editor.pasteMarkdownHint")}
        control={<Switch aria-label={t("editor.pasteMarkdown")} checked={prefs.pasteMarkdown} onCheckedChange={(pasteMarkdown) => setPrefs({ pasteMarkdown })} />}
      />
      <SettingsRow
        label={t("editor.previewPpi")}
        hint={t("editor.previewPpiHint")}
        control={<NumberField label={t("editor.previewPpi")} value={prefs.previewPpi} min={PREF_LIMITS.previewPpi[0]} max={PREF_LIMITS.previewPpi[1]} unit="ppi" onCommit={(v) => v !== null && setPrefs({ previewPpi: v })} />}
      />
      <SettingsRow
        label={t("editor.previewDelay")}
        hint={t("editor.previewDelayHint")}
        control={<NumberField label={t("editor.previewDelay")} value={prefs.previewDelayMs} min={PREF_LIMITS.previewDelayMs[0]} max={PREF_LIMITS.previewDelayMs[1]} unit="ms" onCommit={(v) => v !== null && setPrefs({ previewDelayMs: v })} />}
      />
    </div>
  );
}
