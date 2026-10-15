import type { Editor } from "@tiptap/core";
import { CellSelection, TableMap, findTable } from "@tiptap/pm/tables";
import { LayoutTemplateIcon, MoveIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { endNodeDrag, startNodeDrag } from "./block-drag";

type Place = { left: number; top: number };

const SIZE = 22;
const GAP = 4;

/**
 * A handle at the top left corner of the table under the pointer, as Word has.
 * A click selects every cell of the table and a drag moves the whole table.
 */
export function TableHandle({
  editor,
  frame,
  scroller,
  onChangeTemplate,
}: {
  editor: Editor;
  frame: RefObject<HTMLDivElement | null>;
  scroller: RefObject<HTMLDivElement | null>;
  /** Opens the templates for the table that is selected as a whole */
  onChangeTemplate: () => void;
}) {
  const { t } = useTranslation("editor");
  const [place, setPlace] = useState<Place | null>(null);
  const table = useRef<HTMLElement | null>(null);
  const overHandle = useRef(false);
  // While the handle is being dragged it must stay in the document, or the browser ends the drag
  const dragging = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The menu under the handle stays while the table is selected as a whole, and then the handle stays with it
  const [menu, setMenu] = useState(false);
  const menuOpen = useRef(false);
  menuOpen.current = menu;

  const measure = useCallback(() => {
    const element = table.current;
    const box = frame.current;
    if (!element || !element.isConnected || !box) return setPlace(null);
    const rect = element.getBoundingClientRect();
    const outer = box.getBoundingClientRect();
    // A table scrolled out of the editor has no handle
    if (rect.bottom < outer.top + SIZE || rect.top > outer.bottom) return setPlace(null);
    setPlace({ left: Math.max(rect.left - outer.left - SIZE - GAP, 2), top: Math.max(rect.top - outer.top, 0) });
  }, [frame]);

  useEffect(() => {
    const dom = editor.view.dom;
    const leave = () => {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        if (!overHandle.current && !menuOpen.current && !dragging.current) {
          table.current = null;
          setPlace(null);
        }
      }, 200);
    };
    const move = (event: MouseEvent) => {
      const wrapper = (event.target as HTMLElement | null)?.closest<HTMLElement>(".tableWrapper") ?? null;
      if (!wrapper) return leave();
      clearTimeout(hideTimer.current);
      if (table.current !== wrapper) {
        table.current = wrapper;
        measure();
      }
    };
    const scrolled = () => measure();
    dom.addEventListener("mousemove", move);
    dom.addEventListener("mouseleave", leave);
    const box = scroller.current;
    box?.addEventListener("scroll", scrolled, { passive: true });
    window.addEventListener("resize", scrolled);
    return () => {
      dom.removeEventListener("mousemove", move);
      dom.removeEventListener("mouseleave", leave);
      box?.removeEventListener("scroll", scrolled);
      window.removeEventListener("resize", scrolled);
      clearTimeout(hideTimer.current);
    };
  }, [editor, measure, scroller]);

  // The menu goes when something other than the whole table is selected
  useEffect(() => {
    const check = () => {
      if (menuOpen.current && !(editor.state.selection instanceof CellSelection)) {
        setMenu(false);
        overHandle.current = false;
        table.current = null;
        setPlace(null);
      }
    };
    editor.on("selectionUpdate", check);
    return () => void editor.off("selectionUpdate", check);
  }, [editor]);

  // The text under a table changes its place without a scroll
  useEffect(() => {
    const update = () => table.current && measure();
    editor.on("update", update);
    return () => void editor.off("update", update);
  }, [editor, measure]);

  /** The table that the handle belongs to, found again from its element so a change in the text cannot leave a stale position. */
  const current = () => {
    const element = table.current?.querySelector("table");
    if (!element || !element.isConnected) return null;
    try {
      return findTable(editor.state.doc.resolve(editor.view.posAtDOM(element, 0)));
    } catch {
      return null;
    }
  };

  const selectAll = () => {
    const found = current();
    if (!found) return;
    const map = TableMap.get(found.node);
    const first = found.start + (map.map[0] ?? 0);
    const last = found.start + (map.map[map.map.length - 1] ?? 0);
    editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, first, last)));
    editor.view.focus();
    setMenu(true);
  };

  const startDrag = (event: React.DragEvent<HTMLButtonElement>) => {
    const found = current();
    if (!found) return event.preventDefault();
    dragging.current = true;
    startNodeDrag(editor, found.pos, table.current, event);
  };

  if (!place) return null;
  return (
    <>
    <button
      type="button"
      draggable
      aria-label={t("table.handle")}
      title={t("table.handle")}
      data-testid="table-handle"
      className="absolute z-10 flex cursor-grab items-center justify-center rounded border bg-background text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground active:cursor-grabbing"
      style={{ left: place.left, top: place.top, width: SIZE, height: SIZE }}
      onMouseEnter={() => {
        overHandle.current = true;
        clearTimeout(hideTimer.current);
      }}
      onMouseLeave={() => {
        overHandle.current = false;
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
          if (!overHandle.current && !dragging.current) {
            table.current = null;
            setPlace(null);
          }
        }, 200);
      }}
      onClick={selectAll}
      onDragEnd={() => {
        dragging.current = false;
        endNodeDrag();
      }}
      onDragStart={startDrag}
    >
      <MoveIcon className="size-3.5" aria-hidden="true" />
    </button>
    {menu && (
      <div
        role="menu"
        className="absolute z-10 min-w-40 rounded-md border bg-popover p-1 text-sm shadow-md"
        style={{ left: place.left, top: place.top + SIZE + 4 }}
        onMouseEnter={() => (overHandle.current = true)}
        onMouseLeave={() => (overHandle.current = false)}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
          onClick={() => {
            setMenu(false);
            onChangeTemplate();
          }}
        >
          <LayoutTemplateIcon className="size-4" aria-hidden="true" />
          {t("table.changeTemplate")}
        </button>
      </div>
    )}
    </>
  );
}
