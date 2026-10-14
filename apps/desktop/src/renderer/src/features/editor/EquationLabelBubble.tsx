import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LabelIndex } from "../../../../shared/ipc";
import { checkName, isLabelUsed, labelOfName, nameOfLabel } from "./equation-name";
import { existingLabels } from "./unlabeled-targets";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import { Switch } from "@/components/ui/switch";
import { api } from "../../shared/api";
import { LABELS_CHANGED } from "./use-label-index";

/** Event sent by the shortcut so the box opens for the selected formula. */
export const OPEN_EQUATION_LABEL_EVENT = "marktwain:equation-label";

const HIDE_DELAY_MS = 250;

type Open = { pos: number; rect: { top: number; bottom: number; right: number } };

function formulaPositionOf(editor: Editor, element: HTMLElement): number | null {
  let found: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.type.name === "blockMath") {
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement && (dom === element || dom.contains(element) || element.contains(dom))) found = pos;
      return false;
    }
    return true;
  });
  return found;
}

function rectOf(element: HTMLElement): Open["rect"] {
  const box = element.getBoundingClientRect();
  return { top: box.top, bottom: box.bottom, right: box.right };
}

type Props = { editor: Editor | null; labels: LabelIndex };

/** A small box next to a display formula, where its name is typed. A formula with a name is numbered and can be referred to. */
export function EquationLabelBubble({ editor, labels }: Props) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState<Open | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);
  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      // The box stays while a field in it has the focus
      if (box.current?.contains(document.activeElement)) return;
      setOpen(null);
    }, HIDE_DELAY_MS);
  }, [cancelHide]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom;
    const over = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>('[data-type="block-math"]');
      if (!element) return;
      const pos = formulaPositionOf(editor, element);
      if (pos === null) return;
      cancelHide();
      setOpen((current) => (current?.pos === pos ? current : { pos, rect: rectOf(element) }));
    };
    const out = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-type="block-math"]')) scheduleHide();
    };
    const fromShortcut = (event: Event) => {
      const pos = (event as CustomEvent<{ pos: number }>).detail.pos;
      const element = editor.view.nodeDOM(pos);
      if (element instanceof HTMLElement) {
        cancelHide();
        setOpen({ pos, rect: rectOf(element) });
      }
    };
    const close = () => setOpen(null);
    dom.addEventListener("mouseover", over);
    dom.addEventListener("mouseout", out);
    document.addEventListener(OPEN_EQUATION_LABEL_EVENT, fromShortcut);
    // The box would point at the wrong place after a scroll
    window.addEventListener("scroll", close, true);
    return () => {
      dom.removeEventListener("mouseover", over);
      dom.removeEventListener("mouseout", out);
      document.removeEventListener(OPEN_EQUATION_LABEL_EVENT, fromShortcut);
      window.removeEventListener("scroll", close, true);
      cancelHide();
    };
  }, [editor, cancelHide, scheduleHide]);

  const node = editor && open ? editor.state.doc.nodeAt(open.pos) : null;
  // The formula can be deleted or moved while the box is open
  useEffect(() => {
    if (open && editor && !editor.isDestroyed && node?.type.name !== "blockMath") setOpen(null);
  }, [open, editor, node]);
  if (!editor || !open || node?.type.name !== "blockMath") return null;

  return (
    <Box
      key={`${open.pos}:${String(node.attrs.label ?? "")}`}
      ref={box}
      editor={editor}
      pos={open.pos}
      label={(node.attrs.label as string | null) ?? null}
      rect={open.rect}
      labels={labels}
      onEnter={cancelHide}
      onLeave={scheduleHide}
      onClose={() => setOpen(null)}
      t={t}
    />
  );
}

type BoxProps = {
  editor: Editor;
  pos: number;
  label: string | null;
  rect: Open["rect"];
  labels: LabelIndex;
  onEnter: () => void;
  onLeave: () => void;
  onClose: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  ref: React.Ref<HTMLDivElement>;
};

function Box({ editor, pos, label, rect, labels, onEnter, onLeave, onClose, t, ref }: BoxProps) {
  const [name, setName] = useState(nameOfLabel(label));
  const taken = useMemo(() => existingLabels(editor.state.doc, labels.targets.map((target) => target.label)), [editor, labels]);
  const inDocument = useMemo(() => {
    const found: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "crossRef") found.push(String(node.attrs.label));
    });
    return found;
  }, [editor]);

  // Whether equation numbers restart in each chapter is a setting of the thesis, it is shown here where the numbers are
  const [perChapter, setPerChapter] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.ConfigGetAdvanced)
      .then((state) => !cancelled && setPerChapter((state.values["layout.equation-per-chapter"] ?? state.inherited["layout.equation-per-chapter"]) === true))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function changePerChapter(checked: boolean): Promise<void> {
    setPerChapter(checked);
    await api.invoke(IpcChannel.ConfigSetAdvanced, { values: { "layout.equation-per-chapter": checked } });
    window.dispatchEvent(new Event(LABELS_CHANGED));
  }

  const locked = label !== null && isLabelUsed(label, labels.used, inDocument);
  const problem = name === "" ? null : checkName(name, taken, label);
  const unchanged = labelOfName(name) === label;
  const number = label ? labels.numbers[label] : undefined;

  function write(next: string | null): void {
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, label: next }));
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (name === "" || problem || unchanged || locked) return;
    write(labelOfName(name));
  }

  // Placed above the formula at its right end, below it when there is no room above
  const above = rect.top > 96;
  const style = { position: "fixed" as const, top: above ? rect.top - 8 : rect.bottom + 8, left: Math.max(8, rect.right - 300), width: 300, transform: above ? "translateY(-100%)" : undefined };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t("equation.title")}
      data-testid="equation-label-box"
      style={style}
      className="z-40 grid gap-1.5 rounded-lg border bg-popover p-2 text-sm shadow-md"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
          editor.commands.focus();
        }
      }}
    >
      <form className="flex items-center gap-1.5" onSubmit={submit}>
        <Input
          value={name}
          disabled={locked}
          maxLength={40}
          spellCheck={false}
          autoComplete="off"
          aria-label={t("equation.name")}
          aria-invalid={problem !== null}
          placeholder={t("equation.placeholder")}
          className="h-8 min-w-0 flex-1"
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={locked || name === "" || problem !== null || unchanged}>
          {t("equation.apply")}
        </Button>
        {label !== null && (
          <Button type="button" size="sm" variant="ghost" disabled={locked} onClick={() => write(null)}>
            {t("equation.remove")}
          </Button>
        )}
      </form>
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {t(`equation.${problem}`)}
        </p>
      )}
      {locked && <p className="text-xs text-muted-foreground">{t("equation.locked")}</p>}
      {label === null && !problem && <p className="text-xs text-muted-foreground">{t("equation.hint")}</p>}
      {perChapter !== null && (
        <label className="flex items-center justify-between gap-2 border-t pt-1.5 text-xs text-muted-foreground">
          {t("equation.perChapter")}
          <Switch checked={perChapter} aria-label={t("equation.perChapter")} onCheckedChange={(checked) => void changePerChapter(checked)} />
        </label>
      )}
      {label !== null && number !== undefined && (
        <p className="text-xs text-muted-foreground" data-testid="equation-number">
          {t("equation.numbered", { number })}
        </p>
      )}
    </div>
  );
}
