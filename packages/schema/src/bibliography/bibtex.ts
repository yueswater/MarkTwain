/**
 * A small BibTeX reader and writer. It keeps the position of every entry in the text, so one entry can
 * be changed, added or removed without touching comments, order or the way the rest is written.
 */
export type BibEntry = {
  /** Entry type in lower case, such as article or book */
  type: string;
  key: string;
  /** Field names in lower case, values with the outer braces or quotes taken off */
  fields: Record<string, string>;
  /** Position of the whole entry, from the at sign to the closing brace */
  start: number;
  end: number;
};

export type BibError = { message: string; line: number };

export type BibParseResult = { entries: BibEntry[]; errors: BibError[] };

const IGNORED = new Set(["comment", "preamble", "string"]);

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text[i] === "\n") line += 1;
  return line;
}

/** Reads a value that starts at the index, a braced group, a quoted string, a number or a macro name. */
function readValue(text: string, from: number): { value: string; next: number } | null {
  let i = from;
  const parts: string[] = [];
  for (;;) {
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
    const ch = text[i];
    if (ch === "{") {
      let depth = 0;
      const start = i + 1;
      for (; i < text.length; i += 1) {
        if (text[i] === "\\") i += 1;
        else if (text[i] === "{") depth += 1;
        else if (text[i] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      if (depth !== 0) return null;
      parts.push(text.slice(start, i));
      i += 1;
    } else if (ch === '"') {
      const start = i + 1;
      let depth = 0;
      for (i += 1; i < text.length; i += 1) {
        if (text[i] === "\\") i += 1;
        else if (text[i] === "{") depth += 1;
        else if (text[i] === "}") depth -= 1;
        else if (text[i] === '"' && depth === 0) break;
      }
      if (i >= text.length) return null;
      parts.push(text.slice(start, i));
      i += 1;
    } else {
      const match = /^[A-Za-z0-9_.:-]+/.exec(text.slice(i));
      if (!match) return null;
      parts.push(match[0]);
      i += match[0].length;
    }
    // Pieces joined with # are put together
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
    if (text[i] === "#") i += 1;
    else return { value: parts.join(""), next: i };
  }
}

export function parseBibtex(text: string): BibParseResult {
  const entries: BibEntry[] = [];
  const errors: BibError[] = [];
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at === -1) break;
    const head = /^@\s*([A-Za-z]+)\s*([{(])/.exec(text.slice(at));
    if (!head) {
      i = at + 1;
      continue;
    }
    const type = head[1]!.toLowerCase();
    const open = head[2]!;
    const close = open === "{" ? "}" : ")";
    let j = at + head[0].length;

    if (IGNORED.has(type)) {
      // Skip the whole block, braces may nest
      let depth = 1;
      for (; j < text.length && depth > 0; j += 1) {
        if (text[j] === open) depth += 1;
        else if (text[j] === close) depth -= 1;
      }
      i = j;
      continue;
    }

    const keyMatch = /^\s*([^\s,={}()"]+)\s*,?/.exec(text.slice(j));
    if (!keyMatch) {
      errors.push({ message: "missing key", line: lineAt(text, at) });
      i = j;
      continue;
    }
    const key = keyMatch[1]!;
    j += keyMatch[0].length;
    const fields: Record<string, string> = {};
    let ok = true;
    for (;;) {
      while (j < text.length && /[\s,]/.test(text[j]!)) j += 1;
      if (text[j] === close) {
        j += 1;
        break;
      }
      const name = /^([A-Za-z][A-Za-z0-9_-]*)\s*=/.exec(text.slice(j));
      if (!name) {
        errors.push({ message: "bad field", line: lineAt(text, j) });
        ok = false;
        break;
      }
      j += name[0].length;
      const value = readValue(text, j);
      if (!value) {
        errors.push({ message: "bad value", line: lineAt(text, j) });
        ok = false;
        break;
      }
      fields[name[1]!.toLowerCase()] = value.value.trim();
      j = value.next;
    }
    if (ok) entries.push({ type, key, fields, start: at, end: j });
    i = Math.max(j, at + 1);
  }
  return { entries, errors };
}

/** Field names that are written first and in this order, the others follow alphabetically. */
const FIELD_ORDER = ["author", "editor", "title", "booktitle", "journal", "year", "volume", "number", "pages", "publisher", "address", "school", "doi", "url"];

function braceSafe(value: string): string {
  // A value with unbalanced braces would break the file, so the stray ones are escaped
  let depth = 0;
  let out = "";
  for (const ch of value) {
    if (ch === "{") depth += 1;
    if (ch === "}") {
      if (depth === 0) {
        out += "\\}";
        continue;
      }
      depth -= 1;
    }
    out += ch;
  }
  return out + "}".repeat(depth);
}

export function formatEntry(entry: Pick<BibEntry, "type" | "key" | "fields">): string {
  const names = Object.keys(entry.fields).filter((name) => entry.fields[name] !== "");
  names.sort((a, b) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
  const width = Math.max(0, ...names.map((n) => n.length));
  const lines = names.map((name) => `  ${name.padEnd(width)} = {${braceSafe(entry.fields[name]!)}}`);
  return `@${entry.type}{${entry.key}${lines.length ? ",\n" + lines.join(",\n") + "\n" : "\n"}}`;
}

/** Puts new text in place of the entry that starts and ends where the old one did. */
export function replaceEntry(text: string, entry: Pick<BibEntry, "start" | "end">, replacement: string): string {
  return text.slice(0, entry.start) + replacement + text.slice(entry.end);
}

export function removeEntry(text: string, entry: Pick<BibEntry, "start" | "end">): string {
  // The blank line that separated it goes too
  let end = entry.end;
  while (end < text.length && (text[end] === "\n" || text[end] === "\r")) end += 1;
  return (text.slice(0, entry.start) + text.slice(end)).replace(/^\n+/, "");
}

export function appendEntry(text: string, entry: Pick<BibEntry, "type" | "key" | "fields">): string {
  const base = text.replace(/\s+$/, "");
  return `${base}${base === "" ? "" : "\n\n"}${formatEntry(entry)}\n`;
}

/** A short name for lists and for the editor: the first author's family name and the year. */
export function entryLabel(entry: Pick<BibEntry, "key" | "fields">): string {
  const authors = (entry.fields.author ?? entry.fields.editor ?? "").split(/\s+and\s+/).filter(Boolean);
  const first = authors[0] ?? "";
  const family = first.includes(",") ? first.split(",")[0]!.trim() : (first.split(/\s+/).pop() ?? "");
  const name = family.replace(/[{}\\]/g, "");
  const more = authors.length > 2 ? " et al." : authors.length === 2 ? ` & ${familyOf(authors[1]!)}` : "";
  const year = entry.fields.year ?? entry.fields.date?.slice(0, 4) ?? "";
  const label = [name + more, year].filter(Boolean).join(", ");
  return label || entry.key;
}

function familyOf(author: string): string {
  const family = author.includes(",") ? author.split(",")[0]!.trim() : (author.trim().split(/\s+/).pop() ?? "");
  return family.replace(/[{}\\]/g, "");
}

/** Bibliography keys follow the citation syntax and cannot look like a label. */
export function isValidBibKey(key: string): boolean {
  return /^[A-Za-z0-9_](?:[A-Za-z0-9_]|[:.\-/+](?=[A-Za-z0-9_]))*$/.test(key) && !/^(cha|sec|fig|tbl|eq|lst):/.test(key);
}

export const ENTRY_TYPES = ["article", "book", "inproceedings", "incollection", "phdthesis", "mastersthesis", "techreport", "misc"] as const;

/** Fields a type needs to be cited properly, one of the alternatives in a group is enough. */
export const REQUIRED_FIELDS: Record<string, string[][]> = {
  article: [["author"], ["title"], ["journal"], ["year"]],
  book: [["author", "editor"], ["title"], ["publisher"], ["year"]],
  inproceedings: [["author"], ["title"], ["booktitle"], ["year"]],
  incollection: [["author"], ["title"], ["booktitle"], ["publisher"], ["year"]],
  phdthesis: [["author"], ["title"], ["school"], ["year"]],
  mastersthesis: [["author"], ["title"], ["school"], ["year"]],
  techreport: [["author"], ["title"], ["institution"], ["year"]],
  misc: [["title"]],
};

/** Names of the required fields that are missing. */
export function missingFields(entry: Pick<BibEntry, "type" | "fields">): string[] {
  return (REQUIRED_FIELDS[entry.type] ?? [])
    .filter((group) => !group.some((name) => (entry.fields[name] ?? "").trim() !== ""))
    .map((group) => group[0]!);
}

/** Keys that appear more than once. */
export function duplicateKeys(entries: readonly Pick<BibEntry, "key">[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { key } of entries) (seen.has(key) ? duplicates : seen).add(key);
  return [...duplicates];
}
