import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { nearestLevel, nearestStep, onStep, secondsText, type Level } from "../settings-steps";

type StepSliderProps = {
  label: string;
  steps: readonly number[];
  value: number;
  /** The sentence that says what the chosen delay does, given as seconds text */
  describe: (seconds: string) => string;
  onChange: (value: number) => void;
};

/** A slider of ten steps from the slowest to the fastest, with a line that says what the step means. */
export function StepSlider({ label, steps, value, describe, onChange }: StepSliderProps) {
  const { t } = useTranslation("settings");
  const index = nearestStep(steps, value);
  const exact = onStep(steps, value);
  return (
    <div className="flex w-72 flex-col gap-1">
      <input
        type="range"
        aria-label={label}
        aria-valuetext={`${t("steps.level", { n: index + 1, total: steps.length })}, ${secondsText(steps[index]!)}`}
        min={1}
        max={steps.length}
        step={1}
        // Step 1 is the slowest, so the slider reads from slow at the left to fast at the right
        value={index + 1}
        onChange={(event) => onChange(steps[Number(event.target.value) - 1]!)}
        className="h-2 w-full cursor-pointer accent-foreground"
      />
      <span className="flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{t("steps.slowest")}</span>
        <span>{t("steps.fastest")}</span>
      </span>
      <span className="text-xs text-muted-foreground" data-testid="step-description">
        {exact ? `${t("steps.level", { n: index + 1, total: steps.length })} · ` : `${t("steps.custom")} · `}
        {describe(secondsText(exact ? steps[index]! : value))}
      </span>
    </div>
  );
}

type LevelPickerProps = {
  label: string;
  levels: readonly Level[];
  value: number;
  name: (id: string) => string;
  onChange: (value: number) => void;
  /** What shows the effect of a level, drawn under the choices */
  sample?: (level: Level) => React.ReactNode;
};

/** A few named levels to choose from, with the real value written small. */
export function LevelPicker({ label, levels, value, name, onChange, sample }: LevelPickerProps) {
  const current = nearestLevel(levels, value);
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-md border">
        {levels.map((level) => (
          <button
            key={level.id}
            type="button"
            role="radio"
            aria-checked={current.id === level.id}
            onClick={() => onChange(level.value)}
            className={cn("border-r px-2.5 py-1 text-xs last:border-r-0", current.id === level.id ? "bg-foreground text-background" : "hover:bg-muted")}
          >
            {name(level.id)}
          </button>
        ))}
      </span>
      <span className="text-[11px] text-muted-foreground">{value}</span>
      {sample?.(current)}
    </div>
  );
}

type ClickNumberProps = {
  label: string;
  /** The value of the thesis, null when it follows the school */
  value: number | null;
  /** What applies when there is no value */
  fallback: number;
  min: number;
  max: number;
  onCommit: (value: number | null) => void;
};

/**
 * A number shown as text that turns into a field when it is clicked. Enter or leaving keeps it,
 * Escape puts the old value back, and a value out of range is refused.
 */
export function ClickNumber({ label, value, fallback, min, max, onCommit }: ClickNumberProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const shown = value ?? fallback;

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  function open(): void {
    setText(value === null ? "" : String(value));
    setInvalid(false);
    setEditing(true);
  }

  function finish(keep: boolean): void {
    if (keep) {
      const trimmed = text.trim();
      if (trimmed === "") {
        if (value !== null) onCommit(null);
      } else {
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n < min || n > max) {
          setInvalid(true);
          return;
        }
        if (n !== value) onCommit(n);
      }
    }
    setInvalid(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={open}
        className={cn("inline-flex items-baseline gap-1 rounded-md border border-transparent px-2 py-1 text-sm hover:border-border hover:bg-muted", value === null && "text-muted-foreground")}
      >
        <span className="tabular-nums">{shown}</span>
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={input}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        inputMode="decimal"
        value={text}
        placeholder={String(fallback)}
        autoFocus
        className={cn("h-8 w-16 rounded-md border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-foreground", invalid && "border-destructive")}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") finish(true);
          if (event.key === "Escape") {
            event.stopPropagation();
            finish(false);
          }
        }}
      />
    </span>
  );
}
