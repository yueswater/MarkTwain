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

/** A field of a BibTeX entry as plain text, braces and commands of LaTeX taken away. */
export function plainField(value: string | undefined): string {
  return (value ?? "")
    .replace(/\\[&%$#_{}]/g, (match) => match.slice(1))
    .replace(/\\[a-zA-Z]+\s*/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type EntryCard = {
  /** The title of the work, or the key when the entry has no title, so that a reader can tell which work it is */
  title: string;
  /** Authors and year */
  byline: string;
  /** Where it appeared, the journal, the book it is in, or the publisher */
  source: string;
  /** True when there is no title in the entry */
  untitled: boolean;
};

/** What a card over a citation tells about an entry of the bibliography. */
export function entryCard(entry: { key: string; fields: Record<string, string>; author: string; year: string }): EntryCard {
  const title = plainField(entry.fields.title);
  const authors = plainField(entry.fields.author).split(/\s+and\s+/i).filter(Boolean);
  const names = authors.length > 3 ? `${authors.slice(0, 3).join("; ")} et al.` : authors.join("; ");
  const byline = [names || entry.author, plainField(entry.fields.year) || entry.year].filter(Boolean).join(" · ");
  const source = plainField(entry.fields.journal || entry.fields.booktitle || entry.fields.publisher || entry.fields.school || entry.fields.howpublished);
  return { title: title || entry.key, byline, source, untitled: title === "" };
}
