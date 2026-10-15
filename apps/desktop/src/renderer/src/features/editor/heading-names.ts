/** The levels of heading that a person can name, level 1 is the title of the document and is not chosen from the menus. */
export const NAMED_LEVELS = [2, 3, 4] as const;

/** What a heading level is called, the name that the author chose or else the default of the language. */
export function headingName(level: 2 | 3 | 4, chosen: readonly string[], fallback: string): string {
  return chosen[level - 2]?.trim() || fallback;
}
