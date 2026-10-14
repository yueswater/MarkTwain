import { REQUIRED_FIELDS } from "@marktwain/schema";

/** Fields the form shows for each entry type, in order. */
const LAYOUT: Record<string, string[]> = {
  article: ["author", "title", "journal", "year", "volume", "number", "pages", "doi", "url", "note"],
  book: ["author", "editor", "title", "publisher", "year", "doi", "url", "note"],
  inproceedings: ["author", "title", "booktitle", "year", "pages", "publisher", "doi", "url", "note"],
  incollection: ["author", "editor", "title", "booktitle", "publisher", "year", "pages", "doi", "url", "note"],
  phdthesis: ["author", "title", "school", "year", "url", "note"],
  mastersthesis: ["author", "title", "school", "year", "url", "note"],
  techreport: ["author", "title", "institution", "year", "number", "url", "note"],
  misc: ["author", "title", "year", "publisher", "url", "note"],
};

/** Fields of the form for a type, followed by any other field the entry already has so nothing is hidden. */
export function fieldsFor(type: string, existing: Readonly<Record<string, string>>): string[] {
  const base = LAYOUT[type] ?? LAYOUT.misc!;
  const extra = Object.keys(existing).filter((name) => !base.includes(name));
  return [...base, ...extra];
}

/** Names the form marks as required, the first of each group of alternatives. */
export function requiredNames(type: string): Set<string> {
  return new Set((REQUIRED_FIELDS[type] ?? []).map((group) => group[0]!));
}
