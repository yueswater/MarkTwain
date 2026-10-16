import { PDFViewer, type DocumentManagerCapability, LockModeType, ZoomMode, type PDFViewerConfig, type PluginRegistry, type ScrollCapability, type ViewportCapability } from "@embedpdf/react-pdf-viewer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BuildAnchor } from "../../../../shared/ipc";
import { clampPlace, placeAt, readPlace, writePlace, type PageSpan, type Place } from "./preview-place";
import { anchorFor, blockAt, spot, type BlockRef } from "./preview-sync";

type Props = {
  /** The build to show, null before the first one */
  revision: number | null;
  /** Tells projects apart, the place in the preview is kept for each */
  placeKey: string;
  /** Where the blocks of the build landed on the pages */
  anchors: readonly BuildAnchor[];
  /** The block that the editor is at, the preview shows it when it is not in view, the nonce makes the same block count again */
  follow: (BlockRef & { nonce: number; /** The caret moved, or the editor scrolled and this is the block at its top with how far into it */ mode: "caret" | "scroll"; fraction: number }) | null;
  /** A click on the text of the PDF, the block that holds it */
  onPick: (target: BlockRef) => void;
};

const PREVIEW_URL = "marktwain-preview://";

/**
 * The pages are drawn from the vector PDF at the scale of the screen times this factor, then the browser shrinks them to the screen, so the
 * edges of thin strokes and small Chinese characters stay smooth. A whole page at 1200 dpi would be 140 million pixels, so only what is on
 * the screen is drawn, and zooming in draws it again at the new scale.
 */
const MIN_RENDER_RATIO = 4;

/** Makes the viewer draw at least MIN_RENDER_RATIO pixels for each pixel of the screen, undone when the preview closes. */
function useSharpRendering(): void {
  useEffect(() => {
    const own = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
    const real = () => (own?.get ? own.get.call(window) : window.devicePixelRatio) as number;
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => Math.max(real(), MIN_RENDER_RATIO) });
    return () => {
      if (own) Object.defineProperty(window, "devicePixelRatio", own);
      else delete (window as { devicePixelRatio?: number }).devicePixelRatio;
    };
  }, []);
}

/** The pages of a document along its length, in the units of the PDF. */
function spansOf(scroll: ScrollCapability, documentId: string): PageSpan[] {
  return scroll.forDocument(documentId).getLayout().virtualItems.map((item) => ({ y: item.y, height: item.height }));
}

/** Where the reader is, from the scroll position of the viewport and the layout of the pages. */
function placeOfReader(scroll: ScrollCapability, viewport: ViewportCapability, documentId: string): Place | null {
  const metrics = viewport.forDocument(documentId).getMetrics();
  const total = scroll.forDocument(documentId).getLayout().totalContentSize.height;
  if (!(metrics.scrollHeight > 0) || !(total > 0)) return null;
  // The viewport counts in screen pixels and the layout in points
  return placeAt(spansOf(scroll, documentId), metrics.scrollTop / (metrics.scrollHeight / total));
}

/** Brings the reader to a place, the viewer works out the zoom itself. */
function showPlace(scroll: ScrollCapability, documentId: string, place: Place | null): void {
  if (!place) return;
  const spans = spansOf(scroll, documentId);
  if (spans.length === 0) return;
  const target = clampPlace(spans, place);
  scroll.forDocument(documentId).scrollToPage({ pageNumber: target.page, pageCoordinates: { x: 0, y: target.y }, alignY: 0, behavior: "instant" });
}

/** Brings the page and the height of an anchor into view unless they are in view already, so a caret that moves inside the screen does not move the page. */
function showAnchor(scroll: ScrollCapability, viewport: ViewportCapability, documentId: string, anchor: BuildAnchor): void {
  const spans = spansOf(scroll, documentId);
  const span = spans[anchor.page - 1];
  const metrics = viewport.forDocument(documentId).getMetrics();
  const total = scroll.forDocument(documentId).getLayout().totalContentSize.height;
  if (!span || !(metrics.scrollHeight > 0) || !(total > 0)) return;
  const onScreen = (span.y + anchor.y) * (metrics.scrollHeight / total) - metrics.scrollTop;
  if (onScreen > metrics.clientHeight * 0.1 && onScreen < metrics.clientHeight * 0.8) return;
  scroll.forDocument(documentId).scrollToPage({ pageNumber: anchor.page, pageCoordinates: { x: 0, y: anchor.y }, alignY: 20, behavior: "instant" });
}

function capability<T>(registry: PluginRegistry, id: string): T | null {
  const plugin = registry.getPlugin(id) as unknown as { provides?: () => T } | null;
  return plugin?.provides?.() ?? null;
}

/** Every element that matches, also inside the shadow roots, where the viewer draws itself. */
function deepFind(root: ParentNode, selector: string): Element[] {
  const found = Array.from(root.querySelectorAll(selector));
  for (const el of Array.from(root.querySelectorAll("*"))) if (el.shadowRoot) found.push(...deepFind(el.shadowRoot, selector));
  return found;
}

const SEARCH_WORD = /search|搜尋|搜索/i;

/** The viewer opens its search box without focus, so the letters that follow went to the editor. The box gets the focus when the search button was pressed. */
function focusSearch(event: React.MouseEvent<HTMLDivElement>): void {
  // The click comes from inside a shadow root, so the target seen from here is the host of the viewer
  const origin = event.nativeEvent.composedPath()[0];
  const button = origin instanceof Element ? origin.closest("button") : null;
  const name = button ? `${button.getAttribute("aria-label") ?? ""} ${button.getAttribute("title") ?? ""}` : "";
  if (!SEARCH_WORD.test(name)) return;
  const host = event.currentTarget;
  // The box appears a moment after the click, and is tried again while the panel opens
  for (const delay of [0, 16, 32, 64, 120, 250, 500]) {
    setTimeout(() => {
      const boxes = deepFind(host, "input").filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.offsetParent !== null && !el.disabled);
      const box = boxes.find((input) => SEARCH_WORD.test(input.placeholder));
      if (box && box.getRootNode() instanceof ShadowRoot && (box.getRootNode() as ShadowRoot).activeElement === box) return;
      box?.focus();
    }, delay);
  }
}

/**
 * The PDF of the build in a PDF viewer, so links, search, zoom and text selection work as in any PDF reader.
 * Every build opens as a new document, the place of the reader is found again in it.
 */
export function PdfPreview({ revision, placeKey, anchors, follow, onPick }: Props) {
  const { i18n } = useTranslation();
  useSharpRendering();
  const [registry, setRegistry] = useState<PluginRegistry | null>(null);
  const place = useRef<Place | null>(readPlace(placeKey));
  const current = useRef<string | null>(null);
  /** True from the start of loading a build until its place is put back, scroll events of that time are not the reader */
  const switching = useRef(false);

  // Nothing leaves the computer: the engine comes from the app, and no web font or stamp library is asked for
  const config = useMemo<PDFViewerConfig>(
    () => ({
      wasmUrl: `${PREVIEW_URL}wasm/pdfium.wasm`,
      fontFallback: null,
      fonts: { ui: null, signature: null },
      tabBar: "never",
      theme: { preference: "light" },
      i18n: { defaultLocale: i18n.language.startsWith("zh") ? "zh-TW" : "en" },
      // A thesis is read here, not edited: no annotations, forms, stamps or tools, and the links of the PDF are followed
      disabledCategories: ["annotation", "redaction", "form", "signature", "stamp", "insert", "history", "mode", "document-open", "document-protect", "document-print", "document-capture", "document-export", "document-close", "panel-comment", "panel-annotation-style"],
      annotations: { locked: { type: LockModeType.All }, autoOpenLinks: true },
      stamp: { libraries: [] },
      zoom: { defaultZoomLevel: ZoomMode.FitWidth },
    }),
    // The language is read when the viewer starts
    [],
  );

  useEffect(() => {
    if (!registry) return;
    const scroll = capability<ScrollCapability>(registry, "scroll");
    const viewport = capability<ViewportCapability>(registry, "viewport");
    if (!scroll || !viewport) return;
    // The place is written a moment after the reader stops, when the viewport has its new position, and never while a build is being put back
    let timer: ReturnType<typeof setTimeout> | null = null;
    const remember = () => {
      const documentId = current.current;
      if (!documentId || switching.current) return;
      const now = placeOfReader(scroll, viewport, documentId);
      if (!now) return;
      place.current = now;
      writePlace(placeKey, now);
    };
    const stop = scroll.onScroll(({ documentId }) => {
      if (documentId !== current.current || switching.current) return;
      // Written at once so that closing the preview in the next moment loses nothing, and again when the viewport has settled
      remember();
      if (timer) clearTimeout(timer);
      timer = setTimeout(remember, 120);
    });
    return () => {
      stop();
      if (timer) clearTimeout(timer);
    };
  }, [registry, placeKey]);

  useEffect(() => {
    if (!registry || revision === null || revision < 1) return;
    const documents = capability<DocumentManagerCapability>(registry, "document-manager");
    const scroll = capability<ScrollCapability>(registry, "scroll");
    const viewport = capability<ViewportCapability>(registry, "viewport");
    if (!documents || !scroll || !viewport) return;
    let cancelled = false;
    let stop: (() => void) | null = null;

    void (async () => {
      switching.current = true;
      const response = await fetch(`${PREVIEW_URL}pdf/${revision}.pdf`);
      if (!response.ok || cancelled) {
        switching.current = false;
        return;
      }
      const buffer = await response.arrayBuffer();
      if (cancelled) return;
      const previous = current.current;
      const documentId = `thesis-${revision}`;
      // The new build shows the place of the old one as soon as its pages are laid out
      stop = scroll.onLayoutReady((event) => {
        if (event.documentId !== documentId || !event.isInitial) return;
        current.current = documentId;
        showPlace(scroll, documentId, place.current);
        // The viewer lays out and scrolls once more after it says it is ready, so the place is put back again until it stays
        for (const delay of [60, 250, 600]) setTimeout(() => !cancelled && showPlace(scroll, documentId, place.current), delay);
        if (previous && previous !== documentId) void documents.closeDocument(previous);
        // The scroll that put the place back is not a move of the reader
        setTimeout(() => {
          switching.current = false;
        }, 900);
      });
      documents.openDocumentBuffer({ buffer, name: "thesis.pdf", documentId, autoActivate: true });
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [registry, revision]);

  // The editor moved to a block, the preview shows where it is
  useEffect(() => {
    if (!registry || !follow || !current.current) return;
    const scroll = capability<ScrollCapability>(registry, "scroll");
    const viewport = capability<ViewportCapability>(registry, "viewport");
    if (!scroll || !viewport) return;
    // The scroll of this is not a move of the reader, so it does not become the remembered place
    switching.current = true;
    if (follow.mode === "scroll") {
      // The editor scrolled, the preview scrolls with it so that the same text is at the top
      const at = spot(anchors, follow, follow.fraction);
      if (at) scroll.forDocument(current.current).scrollToPage({ pageNumber: at.page, pageCoordinates: { x: 0, y: at.y }, alignY: 6, behavior: "instant" });
    } else {
      const anchor = anchorFor(anchors, follow);
      if (anchor) showAnchor(scroll, viewport, current.current, anchor);
    }
    const documentId = current.current;
    const timer = setTimeout(() => {
      switching.current = false;
      // Where the preview stopped is the place to come back to after the next build
      const now = placeOfReader(scroll, viewport, documentId);
      if (now) {
        place.current = now;
        writePlace(placeKey, now);
      }
    }, 300);
    return () => clearTimeout(timer);
    // Only a new nonce moves the preview, the anchors of a later build do not
  }, [follow?.nonce]);

  // A click on the text, not a drag and not a link, takes the editor to the block that holds it
  const down = useRef<{ x: number; y: number; top: number } | null>(null);
  function pointer(event: React.MouseEvent, up: boolean): void {
    const scroller = event.nativeEvent.composedPath().find((node): node is HTMLElement => node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 1 && getComputedStyle(node).overflowY === "auto");
    if (!scroller) return;
    if (!up) {
      down.current = { x: event.clientX, y: event.clientY, top: scroller.scrollTop };
      return;
    }
    const start = down.current;
    down.current = null;
    const onLink = event.nativeEvent.composedPath().some((node) => node instanceof HTMLElement && (node.tagName === "A" || node.hasAttribute("href")));
    if (!start || onLink || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4 || !registry) return;
    const scroll = capability<ScrollCapability>(registry, "scroll");
    const id = current.current;
    const content = scroller.firstElementChild;
    if (!scroll || !id || !content) return;
    // A link of the PDF scrolls the page, and that is not a click on the text
    const clientY = event.clientY;
    setTimeout(() => {
      if (Math.abs(scroller.scrollTop - start.top) > 2) return;
      const box = content.getBoundingClientRect();
      const total = scroll.forDocument(id).getLayout().totalContentSize.height;
      if (!(box.height > 0) || !(total > 0)) return;
      const place = placeAt(spansOf(scroll, id), (clientY - box.top) / (box.height / total));
      const target = blockAt(anchors, place.page, place.y);
      if (target) onPick(target);
    }, 120);
  }

  return (
    <div className="h-full w-full" onMouseDownCapture={(event) => pointer(event, false)} onMouseUpCapture={(event) => pointer(event, true)} onClick={focusSearch}>
      <PDFViewer config={config} className="h-full w-full" style={{ height: "100%", width: "100%" }} onReady={setRegistry} />
    </div>
  );
}
