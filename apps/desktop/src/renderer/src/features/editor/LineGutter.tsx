import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { measureLines, type Line } from "./line-numbers";

type Props = {
  editor: Editor | null;
  /** The element that holds the editor and the numbers, its top is where numbers are placed from */
  container: React.RefObject<HTMLElement | null>;
  /** Anything that changes the size of the text, so the lines are measured again */
  layoutKey: string;
};

const GAP_PX = 12;

/** Numbers every visual line of the document in a gutter at the left of the text, wrapped lines included. */
export function LineGutter({ editor, container, layoutKey }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [right, setRight] = useState(0);
  const frame = useRef(0);

  const measure = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const holder = container.current;
      if (!editor || editor.isDestroyed || !holder) return;
      const root = editor.view.dom as HTMLElement;
      const holderBox = holder.getBoundingClientRect();
      setLines(measureLines(root, holderBox.top));
      setRight(root.getBoundingClientRect().left - holderBox.left - GAP_PX);
    });
  }, [editor, container]);

  useLayoutEffect(measure, [measure, layoutKey]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.on("update", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(editor.view.dom);
    // Images and fonts that load later change the heights
    window.addEventListener("load", measure);
    return () => {
      editor.off("update", measure);
      observer.disconnect();
      window.removeEventListener("load", measure);
      cancelAnimationFrame(frame.current);
    };
  }, [editor, measure]);

  return (
    <div aria-hidden="true" data-testid="line-gutter" className="pointer-events-none absolute inset-y-0 left-0 select-none">
      {lines.map((line, index) => (
        <span
          key={index}
          data-line={index + 1}
          className="absolute w-12 text-right font-mono text-[11px] text-muted-foreground/70 tabular-nums"
          style={{ top: line.top, height: line.height, lineHeight: `${Math.min(line.height, 28)}px`, left: Math.max(right - 48, 0) }}
        >
          {index + 1}
        </span>
      ))}
    </div>
  );
}
