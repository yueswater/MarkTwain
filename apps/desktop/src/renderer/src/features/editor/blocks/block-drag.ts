import { nodeAtSafe } from "./node-at";
import type { Editor } from "@tiptap/core";
import type { Node as PmNode, Slice } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

/** Blocks that get a handle at their left, a table has its own handle at the corner. */
const MOVABLE = new Set(["paragraph", "heading", "codeBlock", "blockquote", "bulletList", "orderedList", "figure", "figureGroup", "blockMath", "div", "definitionList", "horizontalRule"]);
const IN_TABLE = new Set(["table", "tableRow", "tableCell", "tableHeader"]);

export type Movable = { pos: number; node: PmNode };

/** The block that a handle would move for a place in the document, null when there is none or it is a part of a table. */
export function movableAt(editor: Editor, x: number, y: number): Movable | null {
  const { view } = editor;
  const box = view.dom.getBoundingClientRect();
  // The pointer is often in the margin, so the point is moved inside the text to find the line it is level with
  const hit = view.posAtCoords({ left: Math.min(Math.max(x, box.left + 8), box.right - 8), top: y });
  if (!hit) return null;
  const $pos = view.state.doc.resolve(hit.pos);
  for (let depth = $pos.depth; depth >= 1; depth -= 1) {
    const node = $pos.node(depth);
    const name = node.type.name;
    if (IN_TABLE.has(name)) return null;
    // A paragraph in a list item is the item, which is what a person sees as one line of the list
    if (name === "listItem") return { pos: $pos.before(depth), node };
    if (MOVABLE.has(name) && $pos.node(depth - 1).type.name !== "listItem") return { pos: $pos.before(depth), node };
  }
  const after = $pos.nodeAfter;
  return after && MOVABLE.has(after.type.name) ? { pos: $pos.pos, node: after } : null;
}

export type NodeDrag = { slice: Slice; from: number; to: number };
let current: NodeDrag | null = null;

/** The drag of a block that a handle started, null when there is none. */
export const nodeDrag = (): NodeDrag | null => current;
export const endNodeDrag = (): void => {
  current = null;
};

/**
 * Starts a drag of the node at pos. The editor takes the drop, see BlockDrop, and moves the node.
 * The selection is not changed, since a table that is selected shows its tools and the page would move under the pointer.
 */
export function startNodeDrag(editor: Editor, pos: number, image: Element | null, event: { dataTransfer: DataTransfer | null; preventDefault: () => void }): void {
  const { view } = editor;
  const data = event.dataTransfer;
  const node = nodeAtSafe(view.state.doc, pos);
  if (!data || !node) return event.preventDefault();
  const slice = NodeSelection.create(view.state.doc, pos).content();
  const { dom, text } = view.serializeForClipboard(slice);
  data.clearData();
  data.setData("text/html", dom.innerHTML);
  data.setData("text/plain", text);
  data.effectAllowed = "copyMove";
  if (image) data.setDragImage(image, 0, 0);
  view.dragging = { slice, move: true };
  current = { slice, from: pos, to: pos + node.nodeSize };
}
