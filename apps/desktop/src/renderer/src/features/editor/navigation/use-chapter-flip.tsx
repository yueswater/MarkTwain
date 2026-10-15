import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, type RefObject } from "react";
import { EdgeFlip, type Edge } from "./edge-flip";

export type Neighbors = { previous: string | null; next: string | null };
export type Hint = { edge: Edge; progress: number; title: string };

type Options = {
  editor: Editor | null;
  scroller: RefObject<HTMLDivElement | null>;
  neighbors?: Neighbors;
  /** Opens the document after this one for the end, the one before for the start */
  onFlip?: (edge: Edge) => void;
  /** Which end of the document to show on arrival, set when it was opened by a push against the end of the other one */
  arrive: { edge: Edge; nonce: number } | null;
  /** Called once the end was shown, so that opening the document again later does not repeat it */
  onArrived?: () => void;
};

/**
 * A wheel that keeps pushing against the top or the bottom of the page opens the document before or after it,
 * and a document that was opened that way shows the end that touches the other one.
 */
export function useChapterFlip({ editor, scroller, neighbors, onFlip, arrive, onArrived }: Options): { hint: Hint | null; onWheel: (event: React.WheelEvent<HTMLDivElement>) => void } {
  const gesture = useRef(new EdgeFlip());
  const [hint, setHint] = useState<Hint | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const arrived = useRef(onArrived);
  arrived.current = onArrived;
  useEffect(() => () => clearTimeout(timer.current), []);

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const box = event.currentTarget;
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const atStart = box.scrollTop <= 0 && neighbors?.previous != null;
    const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 1 && neighbors?.next != null;
    const push = gesture.current.push(event.timeStamp, event.deltaY, atStart, atEnd);
    clearTimeout(timer.current);
    if (push.flip) {
      setHint(null);
      onFlip?.(push.flip);
    } else if (push.edge) {
      setHint({ edge: push.edge, progress: push.progress, title: (push.edge === "end" ? neighbors?.next : neighbors?.previous) ?? "" });
      timer.current = setTimeout(() => setHint(null), 600);
    } else setHint(null);
  };

  useEffect(() => {
    if (!editor || editor.isDestroyed || !arrive) return;
    editor.commands.focus(arrive.edge === "end" ? "end" : "start", { scrollIntoView: false });
    const frame = requestAnimationFrame(() => {
      const box = scroller.current;
      if (box) box.scrollTop = arrive.edge === "end" ? box.scrollHeight : 0;
      arrived.current?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, arrive, scroller]);

  return { hint, onWheel };
}
