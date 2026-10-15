import { PLACEMENTS, type Placement } from "@marktwain/schema";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  /** The placement of the figure or table, null follows the thesis */
  value: Placement | null;
  onChange: (value: Placement | null) => void;
  /** Smaller buttons for a floating menu */
  compact?: boolean;
};

/** A small page with lines of text and a block, the block shows where the figure goes. */
function PageIcon({ placement }: { placement: Placement }) {
  const line = (y: number, key: string) => <line key={key} x1="4" x2="12" y1={y} y2={y} stroke="currentColor" strokeWidth="1" opacity="0.45" />;
  const block = (y: number, height: number, dashed = false) =>
    dashed ? (
      <rect x="4" y={y} width="8" height={height} rx="1" fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="1.6 1.2" />
    ) : (
      <rect x="4" y={y} width="8" height={height} rx="1" fill="currentColor" opacity="0.85" />
    );
  let body: React.ReactNode;
  switch (placement) {
    case "top":
      body = [block(3.5, 5), line(11.5, "a"), line(14, "b"), line(16.5, "c")];
      break;
    case "bottom":
      body = [line(4, "a"), line(6.5, "b"), line(9, "c"), block(12.5, 5)];
      break;
    case "page":
      body = [block(3.5, 13)];
      break;
    case "near":
      body = [line(4, "a"), line(6.5, "b"), block(9.5, 4.5), line(16.5, "c")];
      break;
    case "here":
      body = [line(4, "a"), block(7, 6), <path key="pin" d="M3 7v6M13 7v6" stroke="currentColor" strokeWidth="1.4" />, line(16, "c")];
      break;
    default:
      body = [line(4, "a"), block(7, 6, true), line(16, "c")];
  }
  return (
    <svg viewBox="0 0 16 20" className="h-5 w-4" aria-hidden="true">
      <rect x="1" y="1" width="14" height="18" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
      {body}
    </svg>
  );
}

/** Six icons for where a figure or a table floats, the one in use is marked and a second click on it goes back to the thesis default. */
export function PlacementPicker({ value, onChange, compact }: Props) {
  const { t } = useTranslation("editor");
  return (
    <div role="group" aria-label={t("placement.label")} className="flex items-center gap-0.5">
      {PLACEMENTS.map((placement) => {
        const name = t(`placement.${placement}.name`);
        return (
          <button
            key={placement}
            type="button"
            title={`${name}: ${t(`placement.${placement}.hint`)}`}
            aria-label={name}
            aria-pressed={value === placement}
            // The menu must not take focus from the editor
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(value === placement ? null : placement)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              compact ? "h-7 w-6" : "h-9 w-8",
              value === placement && "bg-accent text-foreground ring-1 ring-foreground/30",
            )}
          >
            <PageIcon placement={placement} />
          </button>
        );
      })}
    </div>
  );
}
