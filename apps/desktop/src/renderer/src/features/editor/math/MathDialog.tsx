import katex from "katex";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export type MathTarget = {
  kind: "inline" | "block";
  latex: string;
  /** Position when editing an existing formula, null when inserting */
  pos: number | null;
  /** Where the formula is or where it will go, in window coordinates, so the box can sit next to it */
  anchor?: { top: number; bottom: number; left: number; right: number };
};

type Props = {
  target: MathTarget;
  onSubmit: (latex: string) => void;
  onRemove: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

/** Renders with KaTeX, returns null on a syntax error. */
export function renderLatex(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: true, output: "htmlAndMathml" });
  } catch {
    return null;
  }
}

const GAP = 8;
const MARGIN = 8;

/** Where the box goes: under the anchor, above it when there is no room below, and inside the window sideways. */
export function placeBox(
  anchor: NonNullable<MathTarget["anchor"]>,
  size: { width: number; height: number },
  view: { width: number; height: number },
): { top: number; left: number } {
  const below = anchor.bottom + GAP;
  const fitsBelow = below + size.height <= view.height - MARGIN;
  const top = fitsBelow ? below : Math.max(MARGIN, anchor.top - GAP - size.height);
  const left = Math.min(Math.max(anchor.left, MARGIN), Math.max(MARGIN, view.width - size.width - MARGIN));
  return { top, left };
}

/**
 * A small box at the formula, where its LaTeX is typed and drawn as it is typed.
 * An inline formula has one line, a display formula has several, and Enter confirms in both.
 */
export function MathDialog({ target, onSubmit, onRemove, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [latex, setLatex] = useState(target.latex);
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const editing = target.pos !== null;
  const block = target.kind === "block";
  const trimmed = latex.trim();
  const html = useMemo(() => (trimmed ? renderLatex(trimmed, block) : ""), [trimmed, block]);
  const valid = trimmed !== "" && html !== null;
  const title = t(block ? "math.blockTitle" : "math.inlineTitle");

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const anchor = target.anchor ?? { top: 120, bottom: 140, left: window.innerWidth / 2 - 200, right: window.innerWidth / 2 };
    setPlace(placeBox(anchor, { width: element.offsetWidth, height: element.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
  }, [target.anchor, html, block]);

  function done(): void {
    if (valid) onSubmit(trimmed);
    onClose();
    onRestoreFocus();
  }

  // Leaving the box keeps a formula that can be drawn and drops one that cannot
  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) done();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  });

  return (
    <div
      ref={box}
      role="dialog"
      aria-label={title}
      data-testid="math-box"
      className="fixed z-50 grid gap-2 rounded-xl border bg-popover p-3 shadow-lg"
      style={{ top: place?.top ?? -9999, left: place?.left ?? -9999, width: block ? 520 : 380, maxWidth: "calc(100vw - 16px)" }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
          onRestoreFocus();
        }
      }}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{title}</span>
        {editing && (
          <button
            type="button"
            className="rounded px-1.5 py-0.5 hover:bg-muted hover:text-destructive"
            onClick={() => {
              onRemove();
              onClose();
              onRestoreFocus();
            }}
          >
            {t("math.remove")}
          </button>
        )}
      </div>
      <div
        aria-live="polite"
        className={`flex items-center justify-center overflow-x-auto rounded-md border bg-muted/30 px-3 ${block ? "min-h-16 py-3" : "min-h-10 py-1.5"}`}
      >
        {html === "" ? (
          <span className="text-sm text-muted-foreground">{t("math.empty")}</span>
        ) : html === null ? (
          <span role="alert" className="text-sm text-destructive">
            {t("math.invalid")}
          </span>
        ) : (
          <span data-testid="math-preview" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          aria-label={t("math.latex")}
          value={latex}
          autoFocus
          rows={block ? 3 : 1}
          spellCheck={false}
          placeholder={block ? "\\int_0^T f(t)\\,\\mathrm{d}t" : "E = mc^2"}
          className="min-h-9 flex-1 resize-none rounded-md border bg-background px-2 py-1.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setLatex(event.target.value)}
          onKeyDown={(event) => {
            // Enter that ends a composition of a Chinese input method is not a confirmation
            if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
            // A display formula keeps several lines with Shift and Enter
            if (block && event.shiftKey) return;
            event.preventDefault();
            if (valid) done();
          }}
        />
        <Button type="button" size="sm" disabled={!valid} onClick={done}>
          {t("math.done")}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{block ? t("math.hintBlock") : t("math.hintInline")}</p>
    </div>
  );
}
