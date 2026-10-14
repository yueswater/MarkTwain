export type RowBox = { id: string; kind: string; top: number; bottom: number };

export type DropTarget = { targetId: string; placement: "before" | "after" };

/**
 * Where a dragged row would land for a pointer at y. Only rows of the same kind count.
 * Above the first row and below the last row of the kind are valid places, so are the gaps between rows.
 */
export function dropTarget(rows: readonly RowBox[], draggedId: string, y: number): DropTarget | null {
  const dragged = rows.find((row) => row.id === draggedId);
  if (!dragged) return null;
  const same = rows.filter((row) => row.kind === dragged.kind);
  if (same.length < 2) return null;

  const first = same[0]!;
  const last = same[same.length - 1]!;
  // Pointer above the first row of the kind, or below the last one, but only while it is still next to the kind
  const all = [...rows].sort((a, b) => a.top - b.top);
  const before = all[all.indexOf(first) - 1];
  const after = all[all.indexOf(last) + 1];
  if (y < first.top) {
    if (before && y < before.top + (before.bottom - before.top) / 2) return null;
    return first.id === draggedId ? null : { targetId: first.id, placement: "before" };
  }
  if (y > last.bottom) {
    if (after && y > after.top + (after.bottom - after.top) / 2) return null;
    return last.id === draggedId ? null : { targetId: last.id, placement: "after" };
  }

  // Inside the span of the kind, the nearest row decides, the half of the row picks before or after
  let best: RowBox | null = null;
  let distance = Infinity;
  for (const row of same) {
    const d = y < row.top ? row.top - y : y > row.bottom ? y - row.bottom : 0;
    if (d < distance) {
      distance = d;
      best = row;
    }
  }
  if (!best) return null;
  // Other kinds cannot sit between two rows of one kind, so a pointer on such a row has no valid place
  const over = rows.find((row) => y >= row.top && y <= row.bottom);
  if (over && over.kind !== dragged.kind) return null;
  const placement = y < best.top + (best.bottom - best.top) / 2 ? "before" : "after";
  if (best.id === draggedId) return null;
  // Dropping next to itself changes nothing
  const index = same.findIndex((row) => row.id === best!.id);
  const draggedIndex = same.findIndex((row) => row.id === draggedId);
  if (placement === "before" && index === draggedIndex + 1) return null;
  if (placement === "after" && index === draggedIndex - 1) return null;
  return { targetId: best.id, placement };
}

/** Pixels to scroll for a pointer near the edge of a list, negative is up, zero is none. */
export function autoScrollStep(y: number, top: number, bottom: number, edge = 32, max = 14): number {
  if (y < top + edge) return -Math.ceil((max * Math.min(edge, top + edge - y)) / edge);
  if (y > bottom - edge) return Math.ceil((max * Math.min(edge, y - (bottom - edge))) / edge);
  return 0;
}
