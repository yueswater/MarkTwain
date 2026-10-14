export type Place = { page: number; frac: number };

const KEY = "marktwain.preview.place:";

/** Where the preview was scrolled to for a project, as a page and a share of that page. */
export function readPlace(project: string): Place | null {
  try {
    const raw = localStorage.getItem(KEY + project);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Place>;
    return Number.isInteger(value.page) && (value.page as number) >= 0 && typeof value.frac === "number" ? { page: value.page as number, frac: Math.min(Math.max(value.frac, 0), 1) } : null;
  } catch {
    return null;
  }
}

export function writePlace(project: string, place: Place): void {
  try {
    localStorage.setItem(KEY + project, JSON.stringify(place));
  } catch {
    // The place is only a convenience
  }
}

export type PageBox = { top: number; height: number };

/** The page and the share of it at the top edge of the view. */
export function placeAt(pages: readonly PageBox[], scrollTop: number): Place {
  if (pages.length === 0) return { page: 0, frac: 0 };
  let page = pages.findIndex((box) => box.top + box.height > scrollTop + 1);
  if (page === -1) page = pages.length - 1;
  const box = pages[page]!;
  return { page, frac: box.height > 0 ? Math.min(Math.max((scrollTop - box.top) / box.height, 0), 1) : 0 };
}

/** The scroll position that shows a place again, the page is clamped when the thesis got shorter. */
export function scrollFor(pages: readonly PageBox[], place: Place): number {
  if (pages.length === 0) return 0;
  const page = Math.min(place.page, pages.length - 1);
  const box = pages[page]!;
  return Math.round(box.top + place.frac * box.height);
}
