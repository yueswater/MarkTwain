import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isHexColor, STATEMENT_KINDS } from "@marktwain/schema";
import { PREF_LIMITS } from "../../../../shared/prefs";
import { NumberField, SettingsRow } from "./fields";
import { LevelPicker, StepSlider } from "./SettingsControls";
import { AUTOSAVE_STEPS, CODE_SIZE_LEVELS, PREVIEW_STEPS } from "./settings-steps";

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

/** A color picker with a field for the hex code, the code is taken when it is complete. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation("settings");
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        value={value}
        className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <Input
        aria-label={`${label} ${t("editor.statementHex")}`}
        value={text}
        maxLength={7}
        className="h-8 w-24 font-mono text-xs"
        aria-invalid={!isHexColor(text)}
        onChange={(event) => {
          setText(event.target.value);
          if (isHexColor(event.target.value)) onChange(event.target.value.toUpperCase());
        }}
      />
    </div>
  );
}

/** How definitions, lemmas and theorems look in the editor, a plain callout or one color for each kind. The PDF does not change. */
export function EditorStatementSettings() {
  const { t } = useTranslation("settings");
  const { t: tEditor } = useTranslation("editor");
  const { prefs, setPrefs } = usePrefs();
  return (
    <div>
      <SettingsRow
        id="setting-editor-statementStyle"
        label={t("editor.statementStyle")}
        hint={t("editor.statementStyleHint")}
        control={
          <Choice
            label={t("editor.statementStyle")}
            value={prefs.statementStyle}
            options={[
              { value: "callout", label: t("editor.statementCallout") },
              { value: "colored", label: t("editor.statementColored") },
            ]}
            onChange={(statementStyle) => setPrefs({ statementStyle })}
          />
        }
      />
      {prefs.statementStyle === "colored" &&
        STATEMENT_KINDS.map((kind) => {
          const label = `${t("editor.statementColor")} ${tEditor(`statement.kinds.${kind.id}`)}`;
          const custom = prefs.statementColors[kind.id];
          return (
            <SettingsRow
              key={kind.id}
              id={`setting-editor-statementColor-${kind.id}`}
              label={tEditor(`statement.kinds.${kind.id}`)}
              control={
                <div className="flex items-center gap-2">
                  {custom && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const { [kind.id]: _removed, ...rest } = prefs.statementColors;
                        void _removed;
                        setPrefs({ statementColors: rest });
                      }}
                    >
                      {t("editor.statementColorReset")}
                    </Button>
                  )}
                  <ColorField label={label} value={custom ?? kind.accent} onChange={(color) => setPrefs({ statementColors: { ...prefs.statementColors, [kind.id]: color } })} />
                </div>
              }
            />
          );
        })}
    </div>
  );
}
