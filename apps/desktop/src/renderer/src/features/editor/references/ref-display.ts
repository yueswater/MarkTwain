import { labelKind } from "@marktwain/schema";

export type RefDisplay = { text: string; broken: boolean };

/**
 * Text shown for a cross-reference in the editor, headings show their title and others show for example Figure 1.1.
 * kindName turns a label prefix such as fig or tbl into a name in the current language.
 */
export function describeRef(
  label: string,
  numbers: Readonly<Record<string, string>>,
  kindName: (kind: string) => string,
  brokenText: string,
): RefDisplay {
  const value = numbers[label];
  const kind = labelKind(label);
  if (value === undefined || kind === null) return { text: `${brokenText} ${label}`.trim(), broken: true };
  if (kind === "cha" || kind === "sec") return { text: value, broken: false };
  return { text: `${kindName(kind)} ${value}`, broken: false };
}

export type CitationInfo = { author: string; year: string };

/**
 * Text shown for a citation. Known keys show the author and the year of their entry, unknown keys show the key and mark the citation as broken.
 */
export function citationDisplay(
  keys: readonly string[],
  form: string,
  info: Readonly<Record<string, CitationInfo>> = {},
): { text: string; broken: boolean } {
  const broken = keys.some((key) => info[key] === undefined);
  const part = (key: string): string => {
    const entry = info[key];
    if (!entry) return key;
    const head = entry.author || key;
    switch (form) {
      case "author":
        return head;
      case "year":
        return entry.year || key;
      case "prose":
        return entry.year ? `${head} (${entry.year})` : head;
      default:
        return entry.year ? `${head}, ${entry.year}` : head;
    }
  };
  const joined = keys.map(part).join("; ");
  return { text: form === "paren" || !["prose", "author", "year"].includes(form) ? `(${joined})` : joined, broken };
}

export function citationText(keys: readonly string[], form: string, info: Readonly<Record<string, CitationInfo>> = {}): string {
  return citationDisplay(keys, form, info).text;
}
