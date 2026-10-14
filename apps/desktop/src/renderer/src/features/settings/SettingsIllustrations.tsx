import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NumberField } from "./fields";
import {
  expandPattern,
  outlineLines,
  pageGeometry,
  sampleNumbers,
  spreadTitle,
  type Margins,
} from "./settings-previews";

type Side = keyof Margins;

/** The page with its four margins, the fields of the margins sit at the edges they set. */
export function PageDiagram({
  paper,
  margins,
  overridden,
  onCommit,
  label,
}: {
  paper: string;
  margins: Margins;
  /** Sides that the thesis sets itself, they get a mark */
  overridden: ReadonlySet<Side>;
  onCommit: (side: Side, value: number | null) => void;
  label: (side: Side) => string;
}) {
  const { t } = useTranslation("settings");
  const [hover, setHover] = useState<Side | null>(null);
  const geometry = pageGeometry(paper, margins);
  const width = 200;
  const height = Math.round((width * geometry.heightCm) / geometry.widthCm);
  const { text } = geometry;

  const field = (side: Side) => (
    <span
      onMouseEnter={() => setHover(side)}
      onMouseLeave={() => setHover(null)}
      onFocus={() => setHover(side)}
      onBlur={() => setHover(null)}
      className={cn("inline-flex rounded-md", hover === side && "ring-2 ring-ring")}
    >
      <NumberField
        label={label(side)}
        value={overridden.has(side) ? margins[side] : null}
        placeholder={String(margins[side])}
        min={0}
        max={10}
        unit="cm"
        className="w-16"
        onCommit={(value) => onCommit(side, value)}
      />
    </span>
  );

  // The band of the margin that is hovered or focused is shaded on the page
  const band = (side: Side) => {
    const style: Record<Side, React.CSSProperties> = {
      top: { left: 0, right: 0, top: 0, height: `${text.top}%` },
      bottom: { left: 0, right: 0, bottom: 0, height: `${100 - text.top - text.height}%` },
      left: { top: 0, bottom: 0, left: 0, width: `${text.left}%` },
      right: { top: 0, bottom: 0, right: 0, width: `${100 - text.left - text.width}%` },
    };
    return (
      <div
        key={side}
        data-testid={`margin-band-${side}`}
        data-active={hover === side}
        onMouseEnter={() => setHover(side)}
        onMouseLeave={() => setHover(null)}
        className={cn("absolute", hover === side ? "bg-ring/25" : "bg-transparent")}
        style={style[side]}
      />
    );
  };

  return (
    <figure className="my-2 flex flex-col items-center gap-2" aria-label={t("diagram.page")}>
      <div className="flex flex-col items-center gap-2">
        {field("top")}
        <div className="flex items-center gap-2">
          {field("left")}
          <div className="relative border bg-white shadow-sm" style={{ width, height }} data-testid="page-diagram">
            {(["top", "bottom", "left", "right"] as const).map(band)}
            <div
              data-testid="page-text-area"
              className="absolute bg-muted-foreground/15"
              style={{ left: `${text.left}%`, top: `${text.top}%`, width: `${text.width}%`, height: `${text.height}%` }}
            />
          </div>
          {field("right")}
        </div>
        {field("bottom")}
      </div>
      {!geometry.valid && (
        <p role="alert" className="text-xs text-destructive">
          {t("diagram.noRoom")}
        </p>
      )}
    </figure>
  );
}

/** Two small pictures to choose where a caption goes, above or below its figure. */
export function CaptionPicker({ value, label, onChange }: { value: "top" | "bottom"; label: string; onChange: (value: "top" | "bottom") => void }) {
  const { t } = useTranslation("settings");
  const picture = (side: "top" | "bottom") => (
    <button
      key={side}
      type="button"
      role="radio"
      aria-checked={value === side}
      aria-label={`${label}: ${t(`option.${side}`)}`}
      onClick={() => onChange(side)}
      className={cn("flex h-14 w-16 flex-col items-stretch justify-center gap-1 rounded-md border bg-background p-1.5", value === side ? "border-foreground ring-1 ring-foreground" : "hover:bg-muted")}
    >
      {side === "top" && <span className="h-1 rounded bg-foreground/60" />}
      <span className="h-6 rounded-sm bg-muted-foreground/25" />
      {side === "bottom" && <span className="h-1 rounded bg-foreground/60" />}
    </button>
  );
  return (
    <span role="radiogroup" aria-label={label} className="flex gap-2">
      {(["top", "bottom"] as const).map(picture)}
    </span>
  );
}

const SAMPLE_SCALE = 0.75;

/** Entries of the sample reference list, the last one is not cited. */
const SAMPLE_ENTRIES = [
  { text: "[1] Fu, 2006", cited: true },
  { text: "[2] Dixit, 1987", cited: true },
  { text: "[3] Konrad, 2009", cited: false },
];

/** Four sample headings, drawn with the sizes and alignments that are set. */
export function HeadingsPreview({ sizes, aligns, lineHeight }: { sizes: number[]; aligns: string[]; lineHeight: number }) {
  const { t } = useTranslation("settings");
  return (
    <figure aria-label={t("diagram.headings")} className="my-2 rounded-md border bg-white p-3 text-black" data-testid="headings-preview">
      {[0, 1, 2, 3].map((index) => (
        <p
          key={index}
          data-level={index + 1}
          className="truncate"
          style={{ fontSize: (sizes[index] ?? 12) * SAMPLE_SCALE, lineHeight, textAlign: (aligns[index] ?? "left") as "left" | "center" | "right" }}
        >
          {t(`diagram.sampleHeading.${index + 1}`)}
        </p>
      ))}
    </figure>
  );
}

/** A small table of contents where the lines inside the chosen depth are drawn in full. */
export function OutlinePreview({ depth }: { depth: number }) {
  const { t } = useTranslation("settings");
  return (
    <figure aria-label={t("diagram.outline")} className="my-2 rounded-md border bg-white p-3 text-xs text-black" data-testid="outline-preview">
      {outlineLines(depth).map((line) => (
        <p
          key={line.level}
          data-shown={line.shown}
          className={cn("flex justify-between gap-2", !line.shown && "text-black/25")}
          style={{ paddingLeft: `${(line.level - 1) * 1}em` }}
        >
          <span>{t(`diagram.outlineLine.${line.level}`)}</span>
          <span>{line.level * 4}</span>
        </p>
      ))}
    </figure>
  );
}

/** The title as it is printed, with the space that the tilde adds. */
export function TitlePreview({ title }: { title: string }) {
  const { t } = useTranslation("settings");
  return (
    <p className="mt-1 text-xs text-muted-foreground" data-testid="title-preview">
      {t("diagram.printedAs")} <span className="rounded border bg-white px-2 py-0.5 text-black">{spreadTitle(title) || "…"}</span>
      <span className="ml-2">{t("diagram.tildeHint")}</span>
    </p>
  );
}

/** Two small lists side by side, with and without the entries that nothing cites. */
export function UncitedPreview({ listAll }: { listAll: boolean }) {
  const { t } = useTranslation("settings");
  const list = (all: boolean) => (
    <div className={cn("flex-1 rounded-md border bg-white p-2 text-xs text-black", all === listAll ? "ring-1 ring-foreground" : "opacity-60")} data-testid={all ? "uncited-all" : "uncited-cited"}>
      <p className="mb-1 font-medium">{t(all ? "diagram.listAll" : "diagram.listCited")}</p>
      {SAMPLE_ENTRIES.filter((entry) => all || entry.cited).map((entry) => (
        <p key={entry.text} className={cn(!entry.cited && "text-black/40")}>
          {entry.text}
        </p>
      ))}
    </div>
  );
  return (
    <figure aria-label={t("diagram.uncited")} className="my-2 flex gap-2">
      {list(false)}
      {list(true)}
    </figure>
  );
}

/** A pattern field for the words of a cross-reference, with buttons for the placeholders and a live example. */
export function PatternInput({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const { t } = useTranslation("settings");
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  const effective = text === "" ? placeholder : text;
  const result = expandPattern(effective, sampleNumbers(effective));

  return (
    <div className="flex flex-col items-end gap-1">
      <Input
        aria-label={label}
        value={text}
        placeholder={placeholder}
        className="h-8 w-72 px-2 text-sm md:text-sm"
        onChange={(event) => setText(event.target.value)}
        onBlur={() => text !== value && onCommit(text)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      />
      <span className="flex gap-1">
        {(["C", "S", "B"] as const).map((name) => (
          <Button
            key={name}
            type="button"
            variant="outline"
            size="xs"
            title={t(`diagram.placeholder.${name}`)}
            aria-label={`${label}: ${t(`diagram.placeholder.${name}`)}`}
            onClick={() => setText((current) => `${current}{${name}}`)}
          >
            {`{${name}}`}
          </Button>
        ))}
      </span>
      <span className="text-xs text-muted-foreground" data-testid="pattern-example">
        {result.ok ? (
          <>
            {t("diagram.example")} <span className="text-foreground">{result.text}</span>
          </>
        ) : (
          <span role="alert" className="text-destructive">
            {t("diagram.badPattern", { problem: result.problem })}
          </span>
        )}
      </span>
    </div>
  );
}

/** Wraps a control with the text that shows what it does, under it. */
export function WithExample({ children, example }: { children: ReactNode; example: string }) {
  return (
    <div className="flex flex-col items-end gap-1">
      {children}
      <span className="text-xs text-muted-foreground" data-testid="setting-example">
        {example}
      </span>
    </div>
  );
}
