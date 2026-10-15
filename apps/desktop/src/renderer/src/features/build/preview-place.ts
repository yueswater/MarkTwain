/** A place in the PDF, a page counted from 1 and a distance down that page in points. */
export type Place = { page: number; y: number };

const KEY = "marktwain.preview.place:";

export function readPlace(project: string): Place | null {
  try {
    const raw = localStorage.getItem(KEY + project);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Place>;
    return Number.isInteger(value.page) && (value.page as number) >= 1 && typeof value.y === "number" && value.y >= 0 ? { page: value.page as number, y: value.y } : null;
  } catch {
    return null;
  }
}

export function writePlace(project: string, place: Place): void {
  try {
    localStorage.setItem(KEY + project, JSON.stringify({ page: place.page, y: Math.round(place.y) }));
  } catch {
    // The place is only a convenience
  }
}

/** Where each page starts along the document and how tall it is, in the units of the PDF. */
export type PageSpan = { y: number; height: number };

/** The page and the distance down it at a position along the document. A position in the gap between pages belongs to the page above. */
export function placeAt(pages: readonly PageSpan[], position: number): Place {
  if (pages.length === 0) return { page: 1, y: 0 };
  let index = 0;
  for (let i = 0; i < pages.length; i += 1) {
    if ((pages[i] as PageSpan).y <= position) index = i;
    else break;
  }
  const span = pages[index] as PageSpan;
  return { page: index + 1, y: Math.min(Math.max(position - span.y, 0), span.height) };
}

/** The place in a document that may have got shorter, the page is clamped and the distance stays inside the page. */
export function clampPlace(pages: readonly PageSpan[], place: Place): Place {
  if (pages.length === 0) return place;
  const page = Math.min(Math.max(place.page, 1), pages.length);
  return { page, y: Math.min(place.y, (pages[page - 1] as PageSpan).height) };
}
