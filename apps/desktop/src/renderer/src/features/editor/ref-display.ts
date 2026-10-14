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

export function citationText(keys: readonly string[], form: string): string {
  const joined = keys.join("; ");
  switch (form) {
    case "prose":
    case "author":
    case "year":
      return joined;
    default:
      return `(${joined})`;
  }
}
