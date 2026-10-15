import type { Editor } from "@tiptap/core";
import { GripVerticalIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { endNodeDrag, movableAt, startNodeDrag } from "./block-drag";

type Place = { left: number; top: number };

const SIZE = 22;

/**
 * A grip at the left of the block under the pointer. Dragging it moves the block to any place in the document,
 * between blocks, into a callout, into a list, or into a table cell as text.
 */
/** inset is how far the handle keeps from the text, the line numbers need room. */
export function BlockHandle({ editor, frame, inset }: { editor: Editor; frame: RefObject<HTMLDivElement | null>; inset: number }) {
  const { t } = useTranslation("editor");
  const [place, setPlace] = useState<Place | null>(null);
  const block = useRef<number | null>(null);
  const overHandle = useRef(false);
  // While the handle is being dragged it must stay in the document, or the browser ends the drag
  const dragging = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!overHandle.current && !dragging.current) {
        block.current = null;
        setPlace(null);
      }
    }, 200);
  }, []);

  const measure = useCallback(() => {
    const box = frame.current;
    const pos = block.current;
    if (!box || pos === null) return setPlace(null);
    const element = editor.view.nodeDOM(pos);
    if (!(element instanceof HTMLElement)) return setPlace(null);
    const rect = element.getBoundingClientRect();
    const outer = box.getBoundingClientRect();
    if (rect.bottom < outer.top || rect.top > outer.bottom) return setPlace(null);
    // A list item sits to the right of its marker, so its handle is moved out of the way of it
    const shift = element.tagName === "LI" ? 44 : 0;
    setPlace({ left: Math.max(rect.left - outer.left - SIZE - 4 - inset - shift, 2), top: Math.max(rect.top - outer.top + 2, 0) });
  }, [editor, frame, inset]);

  useEffect(() => {
    const box = frame.current;
    if (!box) return;
    const move = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-block-handle]")) return;
      // Over the table toolbars and the dialogs nothing is shown
      const found = movableAt(editor, event.clientX, event.clientY);
      if (!found) return hide();
      clearTimeout(hideTimer.current);
      if (block.current !== found.pos) {
        block.current = found.pos;
        measure();
      }
    };
    box.addEventListener("mousemove", move);
    box.addEventListener("mouseleave", hide);
    const scroller = box.querySelector(".overflow-y-auto");
    scroller?.addEventListener("scroll", measure, { passive: true });
    return () => {
      box.removeEventListener("mousemove", move);
      box.removeEventListener("mouseleave", hide);
      scroller?.removeEventListener("scroll", measure);
      clearTimeout(hideTimer.current);
    };
  }, [editor, frame, hide, measure]);

  // A change of the text moves the blocks, so the place is read again from the document and not kept
  useEffect(() => {
    const update = () => {
      if (block.current === null) return;
      if (!editor.state.doc.nodeAt(block.current)) {
        block.current = null;
        setPlace(null);
      } else measure();
    };
    editor.on("update", update);
    return () => void editor.off("update", update);
  }, [editor, measure]);

  if (!place) return null;
  return (
    <button
      type="button"
      draggable
      data-block-handle=""
      aria-label={t("blockHandle")}
      title={t("blockHandle")}
      data-testid="block-handle"
      className="absolute z-10 flex cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      style={{ left: place.left, top: place.top, width: SIZE, height: SIZE }}
      onMouseEnter={() => {
        overHandle.current = true;
        clearTimeout(hideTimer.current);
      }}
      onMouseLeave={() => {
        overHandle.current = false;
        hide();
      }}
      onDragEnd={() => {
        dragging.current = false;
        endNodeDrag();
      }}
      onDragStart={(event) => {
        const pos = block.current;
        if (pos === null) return event.preventDefault();
        dragging.current = true;
        const node = editor.view.nodeDOM(pos);
        startNodeDrag(editor, pos, node instanceof Element ? node : null, event);
      }}
    >
      <GripVerticalIcon className="size-4" aria-hidden="true" />
    </button>
  );
}
