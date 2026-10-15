import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { CheckIcon, SquareDashedIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { LINE_STYLES, LINE_WIDTHS, type Line, type LineStyle } from "@marktwain/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { applyBorderItem, applyBorderPen, itemStates } from "./table-border-commands";
import { BORDER_ITEMS, type BorderItem } from "./table-border-items";

const PEN_KEY = "marktwain.table.pen";
const DEFAULT_PEN: Line = { width: 0.5, style: "solid", color: null };

function readPen(): Line {
  try {
    const stored = JSON.parse(localStorage.getItem(PEN_KEY) ?? "null") as Partial<Line> | null;
    if (stored && typeof stored.width === "number" && stored.width > 0 && stored.width <= 20 && LINE_STYLES.includes(stored.style as LineStyle)) {
      return { width: stored.width, style: stored.style as LineStyle, color: typeof stored.color === "string" ? stored.color : null };
    }
  } catch {
    // The pen is only a convenience
  }
  return DEFAULT_PEN;
}

function rememberPen(pen: Line): void {
  try {
    localStorage.setItem(PEN_KEY, JSON.stringify(pen));
  } catch {
    // The pen is only a convenience
  }
}

/** A cell drawn small, the lines that the item sets are solid and the others faint. */
function BorderIcon({ item }: { item: BorderItem }) {
  const faint = { stroke: "currentColor", strokeWidth: 1, opacity: 0.3, strokeDasharray: "1.5 1.5" } as const;
  const strong = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "square" } as const;
  const on = (...names: string[]) => names.includes(item);
  const top = on("top", "outside", "all");
  const bottom = on("bottom", "outside", "all");
  const left = on("left", "outside", "all");
  const right = on("right", "outside", "all");
  const midH = on("inside", "insideH", "all", "horizontalLine");
  const midV = on("inside", "insideV", "all");
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
      <path d="M2 2h12M2 14h12M2 2v12M14 2v12M2 8h12M8 2v12" fill="none" {...faint} />
      {top && <path d="M2 2h12" {...strong} />}
      {bottom && <path d="M2 14h12" {...strong} />}
      {left && <path d="M2 2v12" {...strong} />}
      {right && <path d="M14 2v12" {...strong} />}
      {midH && <path d="M2 8h12" {...strong} />}
      {midV && <path d="M8 2v12" {...strong} />}
      {item === "horizontalLine" && <path d="M2 11h12" {...strong} />}
      {item === "diagonalDown" && <path d="M2 2l12 12" {...strong} />}
      {item === "diagonalUp" && <path d="M2 14L14 2" {...strong} />}
    </svg>
  );
}

type Props = { editor: Editor };

/**
 * The borders button of a word processor for the selected cells, or the whole table when none are selected.
 * An item that is on turns its lines off. The pen, a width, a style and a color, is what the lines are drawn with.
 */
export function BordersMenu({ editor }: Props) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState(false);
  const [pen, setPen] = useState<Line>(readPen);
  const [widthText, setWidthText] = useState(String(pen.width));
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // The toolbar scrolls sideways and would cut the menu off, so the menu is drawn on the page at the place of the button
  const [place, setPlace] = useState<{ top: number; left: number; above: boolean } | null>(null);

  const states = useEditorState({
    editor,
    selector: ({ editor: e }) => itemStates(e, BORDER_ITEMS),
    equalityFn: (a, b) => !b || JSON.stringify(a) === JSON.stringify(b),
  });

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !root.current) return;
    const box = root.current.getBoundingClientRect();
    const height = panel.current?.offsetHeight ?? 460;
    // Below the button when there is room, else above it, and never past the right edge
    const above = box.bottom + height + 8 > window.innerHeight && box.top > height + 8;
    setPlace({ top: above ? box.top - 6 : box.bottom + 6, left: Math.min(Math.max(8, box.left), window.innerWidth - 272), above });
  }, [open, states]);

  const choose = (next: Line) => {
    setPen(next);
    setWidthText(String(next.width));
    rememberPen(next);
  };

  return (
    <div ref={root} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("borders.label")}
        title={t("borders.label")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(open && "bg-muted")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
      >
        <SquareDashedIcon aria-hidden="true" />
      </Button>
      {open &&
        createPortal(
        <div
          ref={panel}
          role="menu"
          aria-label={t("borders.label")}
          style={place ? { position: "fixed", top: place.top, left: place.left, transform: place.above ? "translateY(-100%)" : undefined, maxHeight: "calc(100vh - 16px)", overflowY: "auto" } : { position: "fixed", visibility: "hidden", top: 0, left: 0 }}
          className="z-50 w-64 rounded-lg border bg-popover p-1.5 text-sm shadow-md"
          onMouseDown={(event) => {
            // Fields in the panel take focus, the buttons do not
            if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement)) event.preventDefault();
          }}
        >
          {BORDER_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitemcheckbox"
              aria-checked={states[item] === true}
              onClick={() => {
                applyBorderItem(editor, item, pen);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-accent"
            >
              <BorderIcon item={item} />
              <span className="flex-1">{t(`borders.items.${item}`)}</span>
              {states[item] && <CheckIcon className="size-3.5 text-foreground" aria-hidden="true" />}
            </button>
          ))}
          <div className="mt-1.5 grid gap-1.5 border-t px-2 pt-2" role="group" aria-label={t("borders.pen")}>
            <p className="text-xs font-medium text-muted-foreground">{t("borders.pen")}</p>
            <div className="flex items-center gap-1.5">
              <select
                aria-label={t("borders.width")}
                value={LINE_WIDTHS.includes(pen.width) ? String(pen.width) : "custom"}
                onChange={(event) => event.target.value !== "custom" && choose({ ...pen, width: Number(event.target.value) })}
                className="h-7 flex-1 rounded border bg-transparent px-1 text-xs"
              >
                {LINE_WIDTHS.map((width) => (
                  <option key={width} value={width}>
                    {t("borders.points", { value: width })}
                  </option>
                ))}
                {!LINE_WIDTHS.includes(pen.width) && <option value="custom">{t("borders.points", { value: pen.width })}</option>}
              </select>
              <Input
                aria-label={t("borders.widthOther")}
                inputMode="decimal"
                value={widthText}
                className="h-7 w-14 px-1.5 text-xs md:text-xs"
                onChange={(event) => {
                  setWidthText(event.target.value);
                  const width = Number(event.target.value);
                  if (Number.isFinite(width) && width > 0 && width <= 20) choose({ ...pen, width });
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                aria-label={t("borders.style")}
                value={pen.style}
                onChange={(event) => choose({ ...pen, style: event.target.value as LineStyle })}
                className="h-7 flex-1 rounded border bg-transparent px-1 text-xs"
              >
                {LINE_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {t(`borders.styles.${style}`)}
                  </option>
                ))}
              </select>
              <input
                type="color"
                aria-label={t("borders.color")}
                value={pen.color ?? "#000000"}
                className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5"
                onChange={(event) => choose({ ...pen, color: event.target.value === "#000000" ? null : event.target.value.toUpperCase() })}
              />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyBorderPen(editor, pen)}>
              {t("borders.applyPen")}
            </Button>
          </div>
        </div>,
        document.body,
        )}
    </div>
  );
}
