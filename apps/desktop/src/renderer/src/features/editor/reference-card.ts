const FOOTNOTE_CHARS = 110;

/** The text of a footnote as plain words, formulas and marks of the source taken away. */
export function footnoteText(source: string): string {
  return source.replace(/\$([^$]+)\$/g, "$1").replace(/\\[\\*_`$]/g, "").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
}

/** The start of a footnote for the tooltip, cut after a fixed number of characters with three dots. */
export function footnoteExcerpt(source: string, max = FOOTNOTE_CHARS): string {
  const chars = Array.from(footnoteText(source));
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max).join("").trimEnd()}...`;
}
