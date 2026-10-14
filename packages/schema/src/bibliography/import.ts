import { parse as parseYaml } from "yaml";
import { parseBibtex, type BibEntry } from "./bibtex";

export type ImportFormat = "bibtex" | "csl-json" | "hayagriva";

export type ImportedEntry = Pick<BibEntry, "type" | "key" | "fields">;

export type ImportResult = { entries: ImportedEntry[]; errors: string[] };

const CSL_TYPES: Record<string, string> = {
  "article-journal": "article",
  "article-magazine": "article",
  "article-newspaper": "article",
  book: "book",
  chapter: "incollection",
  "paper-conference": "inproceedings",
  thesis: "phdthesis",
  report: "techreport",
  webpage: "misc",
  dataset: "misc",
};

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function cslNames(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((person) => {
      if (!isObject(person)) return "";
      if (text(person.literal)) return `{${text(person.literal)}}`;
      const family = text(person.family);
      const given = text(person.given);
      return family && given ? `${family}, ${given}` : family || given;
    })
    .filter(Boolean)
    .join(" and ");
}

function cslYear(value: unknown): string {
  if (!isObject(value)) return "";
  const parts = value["date-parts"];
  if (Array.isArray(parts) && Array.isArray(parts[0])) return text(parts[0][0]);
  return /\d{4}/.exec(text(value.raw))?.[0] ?? "";
}

/** CSL JSON is a list of items, a single item is accepted too. */
export function importCslJson(source: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch {
    return { entries: [], errors: ["invalid JSON"] };
  }
  const items = Array.isArray(data) ? data : [data];
  const entries: ImportedEntry[] = [];
  const errors: string[] = [];
  for (const item of items) {
    if (!isObject(item) || !text(item.id)) {
      errors.push("item without id");
      continue;
    }
    const type = CSL_TYPES[text(item.type)] ?? "misc";
    const container = text(item["container-title"]);
    const fields: Record<string, string> = {
      author: cslNames(item.author),
      editor: cslNames(item.editor),
      title: text(item.title),
      year: cslYear(item.issued),
      volume: text(item.volume),
      number: text(item.issue),
      pages: text(item.page).replace(/(\d)-(\d)/, "$1--$2"),
      publisher: text(item.publisher),
      doi: text(item.DOI),
      url: text(item.URL),
    };
    if (type === "article") fields.journal = container;
    else if (container) fields.booktitle = container;
    if (type === "phdthesis") fields.school = text(item.publisher);
    entries.push({ type, key: text(item.id), fields: dropEmpty(fields) });
  }
  return { entries, errors };
}

function dropEmpty(fields: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== ""));
}

const HAYAGRIVA_TYPES: Record<string, string> = {
  article: "article",
  book: "book",
  chapter: "incollection",
  anthology: "book",
  thesis: "phdthesis",
  report: "techreport",
  web: "misc",
  misc: "misc",
};

function hayagrivaNames(value: unknown): string {
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return list.map((name) => text(name)).filter(Boolean).join(" and ");
}

function hayagrivaYear(value: unknown): string {
  return /\d{4}/.exec(text(value instanceof Date ? value.toISOString() : value))?.[0] ?? "";
}

/** Hayagriva is a YAML mapping from the key to the entry. */
export function importHayagriva(source: string): ImportResult {
  let data: unknown;
  try {
    data = parseYaml(source);
  } catch {
    return { entries: [], errors: ["invalid YAML"] };
  }
  if (!isObject(data)) return { entries: [], errors: ["not a mapping"] };
  const entries: ImportedEntry[] = [];
  const errors: string[] = [];
  for (const [key, item] of Object.entries(data)) {
    if (!isObject(item)) {
      errors.push(key);
      continue;
    }
    const type = HAYAGRIVA_TYPES[text(item.type)] ?? "misc";
    const parent = isObject(item.parent) ? item.parent : {};
    const publisher = isObject(item.publisher) ? text(item.publisher.name) : text(item.publisher);
    const url = isObject(item.url) ? text(item.url.value) : text(item.url);
    const fields: Record<string, string> = {
      author: hayagrivaNames(item.author),
      editor: hayagrivaNames(item.editor),
      title: text(item.title),
      year: hayagrivaYear(item.date),
      volume: text(item.volume ?? parent.volume),
      number: text(item.issue ?? parent.issue),
      pages: text(item["page-range"]).replace(/(\d)-(\d)/, "$1--$2"),
      publisher,
      doi: text(item.doi),
      url,
    };
    const parentTitle = text(parent.title);
    if (type === "article") fields.journal = parentTitle;
    else if (parentTitle) fields.booktitle = parentTitle;
    entries.push({ type, key, fields: dropEmpty(fields) });
  }
  return { entries, errors };
}

/** Picks the format from the file name and the first characters when it is not clear. */
export function detectFormat(name: string, source: string): ImportFormat {
  const lower = name.toLowerCase();
  if (lower.endsWith(".bib") || lower.endsWith(".bibtex")) return "bibtex";
  if (lower.endsWith(".json")) return "csl-json";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "hayagriva";
  const head = source.trimStart();
  if (head.startsWith("@")) return "bibtex";
  if (head.startsWith("[") || head.startsWith("{")) return "csl-json";
  return "hayagriva";
}

export function importEntries(format: ImportFormat, source: string): ImportResult {
  if (format === "csl-json") return importCslJson(source);
  if (format === "hayagriva") return importHayagriva(source);
  const { entries, errors } = parseBibtex(source);
  return { entries, errors: errors.map((e) => `line ${e.line}: ${e.message}`) };
}
