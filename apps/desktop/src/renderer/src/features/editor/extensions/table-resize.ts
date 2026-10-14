import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { columnResizingPluginKey } from "@tiptap/pm/tables";
import type { EditorView } from "@tiptap/pm/view";
import { EDITOR_TABLE_PX } from "../table-commands";

/** Pixels to points, a CSS pixel is 0.75 point. */
export const PX_TO_PT = 0.75;

/** How close to the bottom edge of a cell the pointer must be to grab the row. */
const GRAB_PX = 4;

export type ResizeLabels = {
  width: (percent: number) => string;
  height: (points: number) => string;
};

type RowDrag = { pos: number; startY: number; startHeight: number };

const key = new PluginKey("tableRowResize");

/** Height in points of a row that was dragged to a pixel height, never below a text line. */
export function rowHeightPoints(pixels: number): number {
  return Math.max(12, Math.round(pixels * PX_TO_PT));
}

/** Column width in percent of the editor table, one decimal. */
export function columnPercent(pixels: number): number {
  return Math.round((pixels / EDITOR_TABLE_PX) * 1000) / 10;
}

function cellAt(view: EditorView, event: MouseEvent): { row: HTMLElement; pos: number } | null {
  const target = (event.target as HTMLElement | null)?.closest("td, th") as HTMLElement | null;
  if (!target || !view.dom.contains(target)) return null;
  const box = target.getBoundingClientRect();
  if (box.bottom - event.clientY > GRAB_PX || event.clientY > box.bottom + GRAB_PX) return null;
  const row = target.closest("tr") as HTMLElement | null;
  if (!row) return null;
  const inside = view.posAtDOM(row, 0);
  const $pos = view.state.doc.resolve(inside);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === "tableRow") return { row, pos: $pos.before(depth) };
  }
  return null;
}

/**
 * Drag handles that show the size while you drag: the bottom edge of a row sets its height in points,
 * and the right edge of a column, which the table extension already moves, shows its width in percent.
 */
export const TableResize = Extension.create<{ labels: ResizeLabels }>({
  name: "tableResize",

  addOptions() {
    return { labels: { width: (p) => `${p}%`, height: (p) => `${p} pt` } };
  },

  addProseMirrorPlugins() {
    const { labels } = this.options;
    return [
      new Plugin({
        key,
        view(view) {
          const doc = view.dom.ownerDocument;
          const tip = doc.createElement("div");
          tip.setAttribute("aria-live", "polite");
          tip.setAttribute("data-testid", "resize-value");
          tip.className = "pointer-events-none fixed z-50 hidden rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md tabular-nums";
          doc.body.appendChild(tip);
          let drag: RowDrag | null = null;
          let pointer = { x: 0, y: 0 };

          const show = (text: string) => {
            tip.textContent = text;
            tip.classList.remove("hidden");
            tip.style.left = `${pointer.x + 14}px`;
            tip.style.top = `${pointer.y + 14}px`;
          };
          const hide = () => tip.classList.add("hidden");

          const onMove = (event: MouseEvent) => {
            pointer = { x: event.clientX, y: event.clientY };
            if (drag) {
              const height = rowHeightPoints(drag.startHeight + (event.clientY - drag.startY));
              const node = view.state.doc.nodeAt(drag.pos);
              if (node) view.dispatch(view.state.tr.setNodeMarkup(drag.pos, undefined, { ...node.attrs, height: `${height}pt` }));
              show(labels.height(height));
              return;
            }
            // A column being dragged by the table extension
            const resizing = columnResizingPluginKey.getState(view.state);
            if (resizing && resizing.dragging) {
              const width = resizing.dragging.startWidth + (event.clientX - resizing.dragging.startX);
              show(labels.width(columnPercent(Math.max(20, width))));
              return;
            }
            hide();
            view.dom.classList.toggle("row-resize-cursor", cellAt(view, event) !== null);
          };
          const onDown = (event: MouseEvent) => {
            const hit = cellAt(view, event);
            if (!hit || event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            drag = { pos: hit.pos, startY: event.clientY, startHeight: hit.row.getBoundingClientRect().height };
            pointer = { x: event.clientX, y: event.clientY };
            show(labels.height(rowHeightPoints(drag.startHeight)));
          };
          const onUp = () => {
            drag = null;
            hide();
          };

          view.dom.addEventListener("mousedown", onDown, true);
          doc.addEventListener("mousemove", onMove);
          doc.addEventListener("mouseup", onUp);
          return {
            destroy() {
              view.dom.removeEventListener("mousedown", onDown, true);
              doc.removeEventListener("mousemove", onMove);
              doc.removeEventListener("mouseup", onUp);
              tip.remove();
            },
          };
        },
      }),
    ];
  },
});
