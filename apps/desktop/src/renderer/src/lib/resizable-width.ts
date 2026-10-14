import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export function clampWidth(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
}

function read(key: string, fallback: number): number {
  try {
    const stored = Number(localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0 ? stored : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Width of a panel that sits at the right edge and is resized by dragging its left edge.
 * The width is remembered, and the separator also works with the arrow keys.
 */
export function useResizableWidth(key: string, initial: number, min: number, maxFraction: number) {
  const [width, setWidth] = useState(() => read(key, initial));
  const dragging = useRef<{ startX: number; startWidth: number } | null>(null);
  const max = () => window.innerWidth * maxFraction;

  const commit = useCallback(
    (next: number) => {
      const value = clampWidth(next, min, max());
      setWidth(value);
      try {
        localStorage.setItem(key, String(value));
      } catch {
        // The width is only a convenience
      }
    },
    // max reads the window size when called
    [key, min, maxFraction],
  );

  // A narrower window can leave the panel too wide, so it is clamped again
  useEffect(() => {
    const onResize = () => setWidth((current) => clampWidth(current, min, max()));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [min, maxFraction]);

  const separator = {
    role: "separator" as const,
    "aria-orientation": "vertical" as const,
    "aria-valuenow": width,
    "aria-valuemin": min,
    tabIndex: 0,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      dragging.current = { startX: event.clientX, startWidth: width };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const drag = dragging.current;
      if (drag) commit(drag.startWidth + (drag.startX - event.clientX));
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      dragging.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowLeft") commit(width + 24);
      if (event.key === "ArrowRight") commit(width - 24);
    },
  };

  return { width, separator };
}
