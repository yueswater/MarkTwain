import type { NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { assetUrl } from "./nodes/figure";
import { createValueTip } from "./value-tip";

const MIN_PERCENT = 10;
const CORNERS = ["nw", "ne", "sw", "se"] as const;

/** Width of a dragged figure in percent of the text column, whole percents between a tenth and the full width. */
export function widthPercent(startWidth: number, deltaX: number, corner: "nw" | "ne" | "sw" | "se", column: number): number {
  // The figure stays centred, so each pixel of pointer movement grows or shrinks both sides
  const direction = corner.endsWith("e") ? 1 : -1;
  const width = startWidth + direction * deltaX * 2;
  return Math.min(100, Math.max(MIN_PERCENT, Math.round((width / Math.max(column, 1)) * 100)));
}

export type FigureViewOptions = {
  /** Text of the tooltip while dragging */
  label: (percent: number) => string;
};

/** Node view of a figure: the picture with corner handles to resize it by dragging, like a picture in Word. */
export function figureNodeView(options: FigureViewOptions): NodeViewRenderer {
  return ({ node: initial, getPos, editor }: NodeViewRendererProps) => {
    let node = initial;
    // The view does not exist yet while its first node views are made
    const doc = document;
    const tip = createValueTip(doc, "figure-value");

    const dom = doc.createElement("figure");
    dom.setAttribute("data-figure", "");
    const box = doc.createElement("div");
    box.className = "figure-box";
    const img = doc.createElement("img");
    img.draggable = false;
    box.appendChild(img);
    const captionEl = doc.createElement("figcaption");
    dom.append(box, captionEl);

    for (const corner of CORNERS) {
      const handle = doc.createElement("span");
      handle.className = `figure-handle figure-handle-${corner}`;
      handle.setAttribute("data-handle", corner);
      handle.setAttribute("aria-hidden", "true");
      handle.addEventListener("pointerdown", (event) => startDrag(event, corner));
      box.appendChild(handle);
    }

    function paint(): void {
      const width = node.attrs.width as string | null;
      img.src = assetUrl(String(node.attrs.src));
      img.alt = String(node.attrs.caption ?? "");
      box.style.width = width ?? "";
      dom.setAttribute("data-width", width ?? "");
      captionEl.textContent = String(node.attrs.caption ?? "");
      captionEl.hidden = !node.attrs.caption;
    }

    function startDrag(event: PointerEvent, corner: (typeof CORNERS)[number]): void {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = box.getBoundingClientRect().width;
      const column = dom.getBoundingClientRect().width;
      const handle = event.currentTarget as HTMLElement;
      handle.setPointerCapture(event.pointerId);

      const move = (e: PointerEvent) => {
        const percent = widthPercent(startWidth, e.clientX - startX, corner, column);
        const pos = getPos();
        if (pos === undefined) return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, width: `${percent}%` }));
        tip.show(options.label(percent), e.clientX, e.clientY);
      };
      const end = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
        tip.hide();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    }

    paint();
    return {
      dom,
      update(updated: PmNode) {
        if (updated.type !== node.type) return false;
        node = updated;
        paint();
        return true;
      },
      selectNode() {
        dom.classList.add("is-selected");
      },
      deselectNode() {
        dom.classList.remove("is-selected");
      },
      // The handles handle their own pointer events
      stopEvent: (event: Event) => (event.target as HTMLElement).classList?.contains("figure-handle") ?? false,
      ignoreMutation: () => true,
      destroy() {
        tip.destroy();
      },
    };
  };
}
