import type { SlashItem } from "./slash-items";

const clean = (text: string) => text.toLowerCase().replace(/\s+/g, "");

/**
 * Items whose name or aliases contain the typed text, ignoring case and spaces. A name that starts with the text
 * comes before one that only contains it. With nothing typed every item is listed in its own order.
 */
export function matchSlash(query: string, items: readonly SlashItem[], nameOf: (item: SlashItem) => string): SlashItem[] {
  const needle = clean(query);
  if (needle === "") return [...items];
  const scored: { item: SlashItem; score: number; order: number }[] = [];
  items.forEach((item, order) => {
    const name = clean(nameOf(item));
    const words = [name, ...item.aliases.map(clean), clean(item.id)];
    let score = -1;
    if (name.startsWith(needle)) score = 3;
    else if (words.some((word) => word.startsWith(needle))) score = 2;
    else if (words.some((word) => word.includes(needle))) score = 1;
    if (score >= 0) scored.push({ item, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((entry) => entry.item);
}

/** True when a slash at this place may open the menu: after a space or at the start of the text, and not while composing. */
export function slashMayOpen(textBefore: string, composing: boolean): boolean {
  if (composing) return false;
  return textBefore === "" || /\s$/.test(textBefore);
}
