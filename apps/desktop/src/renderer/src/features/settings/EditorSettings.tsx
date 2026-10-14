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
import { LevelPicker, StepSlider } from "./SettingsControls";
import { AUTOSAVE_STEPS, CODE_SIZE_LEVELS, PPI_LEVELS, PREVIEW_STEPS } from "./settings-steps";

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

/** How the text looks in the editor. */
export function EditorAppearanceSettings() {
  const { t } = useTranslation("settings");
  const { prefs, setPrefs } = usePrefs();
  return (
    <div>
      <SettingsRow
        id="setting-editor-fontFamily"
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
        id="setting-editor-fontSize"
        label={t("editor.fontSize")}
        hint={t("editor.fontSizeHint")}
        control={<NumberField label={t("editor.fontSize")} value={prefs.fontSize} min={PREF_LIMITS.fontSize[0]} max={PREF_LIMITS.fontSize[1]} unit="px" onCommit={(v) => v !== null && setPrefs({ fontSize: v })} />}
      />
      <SettingsRow
        id="setting-editor-lineHeight"
        label={t("editor.lineHeight")}
        control={<NumberField label={t("editor.lineHeight")} value={prefs.lineHeight} min={PREF_LIMITS.lineHeight[0]} max={PREF_LIMITS.lineHeight[1]} step={0.05} onCommit={(v) => v !== null && setPrefs({ lineHeight: v })} />}
      />
      <SettingsRow
        id="setting-editor-contentWidth"
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
    </div>
  );
}

/** Writing, saving and pasting. */
export function EditorWritingSettings() {
  const { t } = useTranslation("settings");
  const { prefs, setPrefs } = usePrefs();
  return (
    <div>
      <SettingsRow
        id="setting-editor-lineNumbers"
        label={t("editor.lineNumbers")}
        hint={t("editor.lineNumbersHint")}
        control={<Switch aria-label={t("editor.lineNumbers")} checked={prefs.lineNumbers} onCheckedChange={(lineNumbers) => setPrefs({ lineNumbers })} />}
      />
      <SettingsRow
        id="setting-editor-spellcheck"
        label={t("editor.spellcheck")}
        hint={t("editor.spellcheckHint")}
        control={<Switch aria-label={t("editor.spellcheck")} checked={prefs.spellcheck} onCheckedChange={(spellcheck) => setPrefs({ spellcheck })} />}
      />
      <SettingsRow
        id="setting-editor-codeFontSize"
        label={t("editor.codeFontSize")}
        control={
          <LevelPicker
            label={t("editor.codeFontSize")}
            levels={CODE_SIZE_LEVELS}
            value={prefs.codeFontSize}
            unit="px"
            name={(id) => t(`sizeLevels.${id}`)}
            onChange={(codeFontSize) => setPrefs({ codeFontSize })}
            sample={() => (
              <code className="rounded border bg-muted px-2 py-1 font-mono" style={{ fontSize: prefs.codeFontSize }}>
                {t("editor.codeSample")}
              </code>
            )}
          />
        }
      />
      <SettingsRow
        id="setting-editor-pasteMarkdown"
        label={t("editor.pasteMarkdown")}
        hint={t("editor.pasteMarkdownHint")}
        control={<Switch aria-label={t("editor.pasteMarkdown")} checked={prefs.pasteMarkdown} onCheckedChange={(pasteMarkdown) => setPrefs({ pasteMarkdown })} />}
      />
      <SettingsRow
        id="setting-editor-autosaveDelay"
        label={t("editor.autosaveDelay")}
        hint={t("editor.autosaveDelayHint")}
        control={
          <StepSlider
            label={t("editor.autosaveDelay")}
            steps={AUTOSAVE_STEPS}
            value={prefs.autosaveDelayMs}
            describe={(seconds) => t("steps.describeSave", { seconds })}
            onChange={(autosaveDelayMs) => setPrefs({ autosaveDelayMs })}
          />
        }
      />
    </div>
  );
}

/** The preview of the thesis. */
export function EditorPreviewSettings() {
  const { t } = useTranslation("settings");
  const { prefs, setPrefs } = usePrefs();
  return (
    <div>
      <SettingsRow
        id="setting-editor-previewPpi"
        label={t("editor.previewPpi")}
        hint={t("editor.previewPpiHint")}
        control={
          <LevelPicker
            label={t("editor.previewPpi")}
            levels={PPI_LEVELS}
            value={prefs.previewPpi}
            unit="ppi"
            name={(id) => t(`sizeLevels.${id}`)}
            onChange={(previewPpi) => setPrefs({ previewPpi })}
          />
        }
      />
      <SettingsRow
        id="setting-editor-previewDelay"
        label={t("editor.previewDelay")}
        hint={t("editor.previewDelayHint")}
        control={
          <StepSlider
            label={t("editor.previewDelay")}
            steps={PREVIEW_STEPS}
            value={prefs.previewDelayMs}
            describe={(seconds) => t("steps.describePreview", { seconds })}
            onChange={(previewDelayMs) => setPrefs({ previewDelayMs })}
          />
        }
      />
    </div>
  );
}
