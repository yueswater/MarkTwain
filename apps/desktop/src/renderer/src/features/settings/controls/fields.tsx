import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Rich } from "../../../shared/rich";

type SettingsRowProps = {
  label: string;
  hint?: string;
  /** The unit of the value, written under the name as 單位為 pt */
  unit?: string;
  /** A button that goes back to the default, it stands right after the name */
  reset?: ReactNode;
  control: ReactNode;
  id?: string;
  below?: ReactNode;
};

/** A label with its hint on the left and the control on the right, like the settings of AnvilNote. */
export function SettingsRow({ label, hint, unit, reset, control, id, below }: SettingsRowProps) {
  const { t } = useTranslation("settings");
  return (
    <div id={id} className="border-b py-3 first:pt-0 last:border-b-0">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium">{label}</p>
            {reset}
          </div>
          {hint ? <p className="text-xs text-muted-foreground"><Rich text={hint} /></p> : null}
          {unit ? <p className="text-xs text-muted-foreground">{t("unitHint", { unit: t(`unitNames.${unit === "%" ? "percent" : unit}`, { defaultValue: unit }) })}</p> : null}
        </div>
        <div className="shrink-0">{control}</div>
      </div>
      {below}
    </div>
  );
}

export function SettingsHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 mb-2 text-sm font-semibold first:mt-0">{children}</h3>;
}

type NumberFieldProps = {
  label: string;
  value: number | null;
  /** Shown when there is no value, for example the inherited one */
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /** Called with a valid number, or null when the field was emptied */
  onCommit: (value: number | null) => void;
};

/** A number input that takes the value when you leave it or press Enter and refuses what is out of range. */
export function NumberField({ label, value, placeholder, min, max, step, className, onCommit }: NumberFieldProps) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setText(value === null ? "" : String(value));
    setInvalid(false);
  }, [value]);

  function commit(): void {
    const trimmed = text.trim();
    if (trimmed === "") {
      setInvalid(false);
      if (value !== null) onCommit(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || (min !== undefined && n < min) || (max !== undefined && n > max)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (n !== value) onCommit(n);
  }

  return (
    <Input
        aria-label={label}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        step={step}
        aria-invalid={invalid ? true : undefined}
        className={cn("h-8 w-24 px-2 text-sm md:text-sm", className)}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      />
  );
}
