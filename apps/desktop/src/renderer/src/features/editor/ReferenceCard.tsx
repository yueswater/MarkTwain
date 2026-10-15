import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { LabelIndex, LabelPreview } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { documentTitle } from "../project/document-title";
import { renderLatex, placeBox } from "./MathDialog";
import { entryCard, footnoteExcerpt } from "./reference-card";
import { useBibliography } from "../bibliography/bibliography-context";
import { describeRef } from "./ref-display";
import { assetUrl } from "./extensions/nodes/figure";

/** Event sent by the shortcut so the card opens for the selected reference. */
export const OPEN_REFERENCE_CARD_EVENT = "marktwain:reference-card";

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 220;

type Target =
  | { kind: "ref"; label: string; anchor: Anchor }
  | { kind: "citation"; keys: string[]; anchor: Anchor }
  | { kind: "footnote"; text: string; anchor: Anchor };
type Anchor = { top: number; bottom: number; left: number; right: number };

const anchorOf = (element: Element): Anchor => {
  const box = element.getBoundingClientRect();
  return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
};

type Props = {
  editor: Editor | null;
  labels: LabelIndex;
  /** Goes to a block of a document, opening the document first */
  onOpenTarget: (documentId: string, block: number) => void;
};

/** Hover over a cross-reference or a footnote and a card with what it points to opens next to it. */
export function ReferenceCard({ editor, labels, onOpenTarget }: Props) {
  const [target, setTarget] = useState<Target | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const scheduleClose = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    cancelClose();
    closeTimer.current = setTimeout(() => setTarget(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom;
    const read = (element: Element): Target | null => {
      if (element.matches("[data-cross-ref]")) return { kind: "ref", label: element.getAttribute("data-label") ?? "", anchor: anchorOf(element) };
      if (element.matches("span[data-citation]")) return { kind: "citation", keys: (element.getAttribute("data-keys") ?? "").split(",").filter(Boolean), anchor: anchorOf(element) };
      if (element.matches("sup[data-footnote]")) return { kind: "footnote", text: element.getAttribute("data-text") ?? "", anchor: anchorOf(element) };
      return null;
    };
    const over = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest("[data-cross-ref], span[data-citation], sup[data-footnote]");
      if (!element) return;
      cancelClose();
      const next = read(element);
      if (!next) return;
      if (openTimer.current) clearTimeout(openTimer.current);
      // A short wait, so passing the pointer over a reference does not flash cards
      openTimer.current = setTimeout(() => setTarget(next), OPEN_DELAY_MS);
    };
    const out = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest("[data-cross-ref], span[data-citation], sup[data-footnote]")) scheduleClose();
    };
    const fromShortcut = (event: Event) => {
      const pos = (event as CustomEvent<{ pos: number }>).detail.pos;
      const element = editor.view.nodeDOM(pos);
      if (element instanceof HTMLElement) {
        const next = read(element);
        if (next) setTarget(next);
      }
    };
    const close = () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      setTarget(null);
    };
    dom.addEventListener("mouseover", over);
    dom.addEventListener("mouseout", out);
    // Typing, scrolling and Escape put the card away
    dom.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    document.addEventListener(OPEN_REFERENCE_CARD_EVENT, fromShortcut);
    return () => {
      dom.removeEventListener("mouseover", over);
      dom.removeEventListener("mouseout", out);
      dom.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener(OPEN_REFERENCE_CARD_EVENT, fromShortcut);
      if (openTimer.current) clearTimeout(openTimer.current);
      cancelClose();
    };
  }, [editor, cancelClose, scheduleClose]);

  if (!target) return null;
  if (target.kind === "citation") {
    return (
      <Card anchor={target.anchor} width={340} testId="citation-card" onEnter={cancelClose} onLeave={scheduleClose}>
        <CitationBody keys={target.keys} />
      </Card>
    );
  }
  return target.kind === "footnote" ? (
    <Card anchor={target.anchor} width={280} fixedHeight={104} testId="footnote-card" onEnter={cancelClose} onLeave={scheduleClose}>
      <FootnoteBody text={target.text} />
    </Card>
  ) : (
    <Card anchor={target.anchor} width={340} testId="reference-card" onEnter={cancelClose} onLeave={scheduleClose}>
      <ReferenceBody label={target.label} labels={labels} onOpenTarget={(documentId, block) => { setTarget(null); onOpenTarget(documentId, block); }} />
    </Card>
  );
}

function Card({ anchor, width, fixedHeight, testId, onEnter, onLeave, children }: { anchor: Anchor; width: number; fixedHeight?: number; testId: string; onEnter: () => void; onLeave: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const next = placeBox(anchor, { width, height: element.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
    // The content can change the height, a new object every time would run this again and again
    setPlace((current) => (current && current.top === next.top && current.left === next.left ? current : next));
  });
  return (
    <div
      ref={box}
      role="tooltip"
      data-testid={testId}
      className="fixed z-50 overflow-hidden rounded-lg border bg-popover p-3 text-sm shadow-lg"
      style={{ top: place?.top ?? -9999, left: place?.left ?? -9999, width, height: fixedHeight }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}

function FootnoteBody({ text }: { text: string }) {
  const { t } = useTranslation("editor");
  return (
    <>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{t("card.footnote")}</p>
      <p className="leading-snug text-foreground/90">{footnoteExcerpt(text)}</p>
    </>
  );
}

function ReferenceBody({ label, labels, onOpenTarget }: { label: string; labels: LabelIndex; onOpenTarget: (documentId: string, block: number) => void }) {
  const { t } = useTranslation("editor");
  const { t: tProject } = useTranslation("project");
  const [preview, setPreview] = useState<LabelPreview | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.LabelPreview, { label })
      .then((value) => !cancelled && setPreview(value))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [label]);

  const ref = describeRef(label, labels.numbers, (kind) => t(`crossRef.kind.${kind}`), t("crossRef.broken"));
  if (preview === undefined) return <p className="text-muted-foreground">{ref.text}</p>;
  if (preview === null) {
    return (
      <>
        <p className="font-medium text-destructive">{t("card.broken")}</p>
        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{label}</p>
      </>
    );
  }
  const place = documentTitle(tProject, { kind: preview.document.kind as never, position: preview.document.position, title: preview.document.title });
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-muted-foreground">{ref.text}</p>
      <Content content={preview.content} />
      <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
        <span className="truncate">{place}</span>
        <Button type="button" variant="ghost" size="xs" onClick={() => onOpenTarget(preview.documentId, preview.block)}>
          {t("card.goTo")}
        </Button>
      </div>
    </div>
  );
}

/** Text with formulas between dollar signs, the formulas are drawn and the rest stays text. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\$[^$]+\$)/).map((part, index) => {
        if (part.length > 2 && part.startsWith("$") && part.endsWith("$")) {
          const html = renderLatex(part.slice(1, -1), false);
          if (html) return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

/** The works that a citation points to, each with its title so that a reader can tell which work it is. */
function CitationBody({ keys }: { keys: string[] }) {
  const { t } = useTranslation("editor");
  const { view } = useBibliography();
  return (
    <ul className="grid gap-2.5">
      {keys.map((key) => {
        const entry = view.items.find((item) => item.key === key);
        if (!entry) {
          return (
            <li key={key}>
              <p className="font-medium text-destructive">{t("card.citationMissing")}</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{key}</p>
            </li>
          );
        }
        const card = entryCard(entry);
        return (
          <li key={key} className="grid gap-0.5">
            <p className={cn("leading-snug", card.untitled ? "font-mono text-xs text-muted-foreground" : "font-semibold")}>{card.title}</p>
            {card.byline && <p className="text-xs text-muted-foreground">{card.byline}</p>}
            {card.source && <p className="text-xs italic text-muted-foreground">{card.source}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function Content({ content }: { content: LabelPreview["content"] }) {
  const { t } = useTranslation("editor");
  switch (content.type) {
    case "figure":
      return (
        <figure className="grid gap-1">
          {content.src && <img src={assetUrl(content.src)} alt="" className="max-h-40 w-full rounded border bg-white object-contain" />}
          <figcaption className="text-xs text-muted-foreground"><Rich text={content.caption} /></figcaption>
        </figure>
      );
    case "table":
      return (
        <div className="grid gap-1">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {content.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "border-y-2 border-foreground/60 font-medium" : rowIndex === content.rows.length - 1 && !content.more ? "border-b-2 border-foreground/60" : ""}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="max-w-28 truncate px-1 py-0.5">
                      <Rich text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {content.more && <p className="text-xs text-muted-foreground">{t("card.moreRows")}</p>}
          <p className="text-xs text-muted-foreground"><Rich text={content.caption} /></p>
        </div>
      );
    case "formula": {
      const html = renderLatex(content.latex, true);
      return html ? <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} /> : <code className="text-xs">{content.latex}</code>;
    }
    case "statement":
      return (
        <div className="grid gap-1">
          <p className="font-semibold leading-snug">
            {t(`statement.kinds.${content.kind}`)}
            {content.title ? <Rich text={`（${content.title}）`} /> : null}
          </p>
          {content.excerpt && <p className="text-xs leading-snug text-muted-foreground"><Rich text={content.excerpt} /></p>}
        </div>
      );
    case "heading":
      return (
        <div className="grid gap-1">
          <p className="font-semibold leading-snug"><Rich text={content.title} /></p>
          {content.excerpt && <p className="text-xs leading-snug text-muted-foreground"><Rich text={content.excerpt} /></p>}
        </div>
      );
    case "code":
      return (
        <div className="grid gap-1">
          <pre className="overflow-hidden rounded bg-muted p-2 font-mono text-xs leading-5">
            {content.text}
            {content.more ? "\n..." : ""}
          </pre>
          {content.caption && <p className="text-xs text-muted-foreground"><Rich text={content.caption} /></p>}
        </div>
      );
  }
}
