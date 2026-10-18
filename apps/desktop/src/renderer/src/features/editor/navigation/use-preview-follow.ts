import { nodeAtSafe } from "../blocks/node-at";
import type { Editor } from "@tiptap/core";
import { useEffect, useRef, type RefObject } from "react";

type Options = {
  editor: Editor | null;
  scroller: RefObject<HTMLDivElement | null>;
  /** The top level block at the top of the editor while it scrolls, and how far into the block the top is, 0 to 1 */
  onTopBlock?: (block: number, fraction: number) => void;
  /** A block that something outside the editor asks to show, such as a build error or a click in the preview */
  scrollTo: { block: number; nonce: number } | null;
};

/**
 * What the editor tells the preview and what the preview can ask of the editor.
 * The scroll of the editor is reported only after a person used the wheel, a key or the pointer, since a scroll without one is the page settling.
 */
export function usePreviewFollow({ editor, scroller, onTopBlock, scrollTo }: Options): {
  /** Marks that a person is using the editor now */
  touch: () => void;
  onScroll: () => void;
} {
  const lastInput = useRef(0);
  const topRef = useRef(onTopBlock);
  topRef.current = onTopBlock;
  const frame = useRef<number | null>(null);

  /** Tells which top level block is at the top of the editor, once for every frame of scrolling, so the preview scrolls with it. */
  const onScroll = () => {
    if (frame.current !== null || !topRef.current || Date.now() - lastInput.current > 1000) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const box = scroller.current;
      if (!editor || editor.isDestroyed || !box) return;
      const top = box.getBoundingClientRect().top + 8;
      // The blocks are in order down the page, so the first one whose bottom is below the top edge is the one at the top
      let found = -1;
      let low = 0;
      let high = editor.state.doc.childCount - 1;
      let rect: DOMRect | null = null;
      while (low <= high) {
        const middle = (low + high) >> 1;
        let offset = 0;
        for (let i = 0; i < middle; i += 1) offset += editor.state.doc.child(i).nodeSize;
        const dom = editor.view.nodeDOM(offset);
        const blockBox = dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;
        if (blockBox && blockBox.bottom > top) {
          found = middle;
          rect = blockBox;
          high = middle - 1;
        } else low = middle + 1;
      }
      if (found >= 0 && rect) topRef.current?.(found, rect.height > 0 ? (top - rect.top) / rect.height : 0);
    });
  };

  // Move the cursor to the top level block that was asked for, and show it
  useEffect(() => {
    if (!editor || editor.isDestroyed || !scrollTo) return;
    let pos = 0;
    editor.state.doc.forEach((_node, offset, index) => {
      if (index === scrollTo.block) pos = offset;
    });
    const node = nodeAtSafe(editor.state.doc, pos);
    // The editor does not scroll to the selection by itself, it would cut short the smooth scroll below when the block is out of view
    const chain = editor.chain().focus(undefined, { scrollIntoView: false });
    // Atom blocks such as figures have no text, so select the whole node
    (node?.isAtom ? chain.setNodeSelection(pos) : chain.setTextSelection(Math.min(pos + 1, editor.state.doc.content.size))).run();
    // The block is shown in the middle of the editor, a block taller than the editor from near its top
    const dom = editor.view.nodeDOM(pos);
    const box = scroller.current;
    if (dom instanceof HTMLElement && box) {
      const place = dom.getBoundingClientRect();
      const frameBox = box.getBoundingClientRect();
      const toTop = place.height > frameBox.height * 0.8 ? place.top - (frameBox.top + frameBox.height * 0.15) : place.top + place.height / 2 - (frameBox.top + frameBox.height / 2);
      box.scrollTo({ top: box.scrollTop + toTop, behavior: "smooth" });
    }
  }, [editor, scrollTo, scroller]);

  return { touch: () => (lastInput.current = Date.now()), onScroll };
}
