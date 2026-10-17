import CodeMirror, { EditorView, Prec, keymap } from "@uiw/react-codemirror";
import { latex as latexLanguage } from "codemirror-lang-latex";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { latexErrorNear, placeBox, renderLatex, type MathTarget } from "./math-format";

export type { MathTarget } from "./math-format";

type Props = {
  target: MathTarget;
  onSubmit: (latex: string) => void;
  onRemove: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
};

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

  // The keys read the latest state through a ref, so the extensions are made once and the document is not reset
  const latest = useRef({ valid, done: () => {} });
  const extensions = useMemo(
    () => [
      latexLanguage({ enableLinting: false, autoCloseBrackets: true, autoCloseTags: false }),
      EditorView.contentAttributes.of({ "aria-label": t("math.latex"), spellcheck: "false" }),
      EditorView.lineWrapping,
      Prec.highest(
        keymap.of([
          {
            key: "Enter",
            run: (view) => {
              // Enter that ends a composition of a Chinese input method is not a confirmation
              if (view.composing) return false;
              if (latest.current.valid) latest.current.done();
              return true;
            },
          },
          // A display formula keeps several lines with Shift and Enter
          { key: "Shift-Enter", run: () => !block },
        ]),
      ),
    ],
    [block, t],
  );

  function done(): void {
    if (valid) onSubmit(trimmed);
    onClose();
    onRestoreFocus();
  }

  latest.current = { valid, done };

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
            {(() => {
              const near = latexErrorNear(trimmed);
              return near ? ` ${t("math.near", { near })}` : "";
            })()}
          </span>
        ) : (
          <span data-testid="math-preview" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-background transition-colors focus-within:border-foreground [&_.cm-editor]:bg-transparent [&_.cm-editor]:text-sm [&_.cm-editor.cm-focused]:!outline-none [&_.cm-scroller]:font-mono [&_.cm-content]:px-1 [&_.cm-content]:py-1.5">
          <CodeMirror
            value={latex}
            autoFocus
            onChange={setLatex}
            extensions={extensions}
            theme="light"
            minHeight={block ? "4.5rem" : "2.25rem"}
            maxHeight="12rem"
            placeholder={block ? "\\int_0^T f(t)\\,\\mathrm{d}t" : "E = mc^2"}
            basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
          />
        </div>
        <Button type="button" size="sm" disabled={!valid} onClick={done}>
          {t("math.done")}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{block ? t("math.hintBlock") : t("math.hintInline")}</p>
    </div>
  );
}
