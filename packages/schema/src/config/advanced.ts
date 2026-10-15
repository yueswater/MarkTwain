import { Document, parseDocument } from "yaml";
import { BULLET_SYMBOLS, ORDERED_STYLES } from "../lists/styles";
import { DEFAULT_PLACEMENT, PLACEMENTS } from "../placement";
import { STATEMENT_KINDS } from "../statements/kinds";

/**
 * Thesis format settings beyond the basic form: layout, numbering, captions, headings,
 * page numbers, cross-references and the bibliography. Each one is a path in config.yml.
 * A field that is not set in config.yml inherits from the school preset and the template defaults.
 */
export type AdvancedKind =
  | "number"
  | "text"
  | "bool"
  | "select"
  /** A list of strings, typed comma separated */
  | "list"
  /** Four numbers, one for each heading level */
  | "numbers4"
  /** Four choices, one for each heading level */
  | "select4";

export type AdvancedGroup = "page" | "text" | "numbering" | "captions" | "headings" | "pageNumber" | "crossRef" | "bibliography" | "outline" | "watermark" | "statements" | "placement" | "lists";

export type AdvancedField = {
  path: string;
  group: AdvancedGroup;
  kind: AdvancedKind;
  options?: readonly string[];
  /** Allowed range for numbers */
  min?: number;
  max?: number;
  unit?: string;
};

const NUMBERING = ["1", "a", "A", "i", "I", "*"] as const;
const SIDE = ["top", "bottom"] as const;
const ALIGN = ["left", "center", "right"] as const;

export const ADVANCED_FIELDS: readonly AdvancedField[] = [
  { path: "layout.paper", group: "page", kind: "select", options: ["a4", "us-letter", "b5"] },
  { path: "layout.margin.top", group: "page", kind: "number", min: 0, max: 10, unit: "cm" },
  { path: "layout.margin.bottom", group: "page", kind: "number", min: 0, max: 10, unit: "cm" },
  { path: "layout.margin.left", group: "page", kind: "number", min: 0, max: 10, unit: "cm" },
  { path: "layout.margin.right", group: "page", kind: "number", min: 0, max: 10, unit: "cm" },

  { path: "layout.font-latin", group: "text", kind: "list" },
  { path: "layout.font-cjk", group: "text", kind: "list" },
  { path: "layout.font-size", group: "text", kind: "number", min: 6, max: 24, unit: "pt" },
  { path: "layout.line-height", group: "text", kind: "number", min: 1, max: 3 },
  { path: "layout.par-spacing", group: "text", kind: "number", min: 0, max: 5, unit: "em" },
  { path: "layout.first-line-indent", group: "text", kind: "number", min: 0, max: 5, unit: "em" },
  { path: "layout.first-line-indent-all", group: "text", kind: "bool" },
  { path: "layout.justify", group: "text", kind: "bool" },

  { path: "layout.footnote-numbering", group: "numbering", kind: "select", options: NUMBERING },
  { path: "layout.footnote-per-chapter", group: "numbering", kind: "bool" },
  { path: "layout.equation-numbering", group: "numbering", kind: "select", options: NUMBERING },
  { path: "layout.equation-per-chapter", group: "numbering", kind: "bool" },

  { path: "layout.caption-position.image", group: "captions", kind: "select", options: SIDE },
  { path: "layout.caption-position.table", group: "captions", kind: "select", options: SIDE },
  { path: "layout.caption-position.code", group: "captions", kind: "select", options: SIDE },

  { path: "layout.heading.size", group: "headings", kind: "numbers4", min: 6, max: 40, unit: "pt" },
  { path: "layout.heading.align", group: "headings", kind: "select4", options: ALIGN },
  { path: "layout.heading.line-height", group: "headings", kind: "number", min: 1, max: 3 },

  { path: "page-number.position", group: "pageNumber", kind: "select", options: SIDE },
  { path: "page-number.align", group: "pageNumber", kind: "select", options: ALIGN },
  { path: "page-number.format", group: "pageNumber", kind: "text" },

  { path: "cross-ref.chapter", group: "crossRef", kind: "text" },
  { path: "cross-ref.section", group: "crossRef", kind: "text" },
  { path: "cross-ref.subsection", group: "crossRef", kind: "text" },

  { path: "outline.depth", group: "outline", kind: "number", min: 1, max: 4 },

  // The image is chosen with a picker, the value is a path in the project, none, or absent to follow the school
  { path: "watermark.image", group: "watermark", kind: "text" },
  { path: "watermark.width", group: "watermark", kind: "number", min: 10, max: 100, unit: "%" },
  { path: "watermark.opacity", group: "watermark", kind: "number", min: 5, max: 100, unit: "%" },

  // Where figures and tables float when they say nothing, the template does not know these and they are taken out of the config before a build
  { path: "placement.figure", group: "placement", kind: "select", options: PLACEMENTS },
  { path: "placement.table", group: "placement", kind: "select", options: PLACEMENTS },

  // The marker of each level of a list, the template does not know them and they are taken out of the config before a build
  { path: "lists.ordered", group: "lists", kind: "list", options: ORDERED_STYLES.map((style) => style.id) },
  { path: "lists.bullet", group: "lists", kind: "list", options: BULLET_SYMBOLS.map((symbol) => symbol.id) },

  // Theorem like blocks, the name of each kind, a kind that is not set keeps the default of the language
  ...STATEMENT_KINDS.map<AdvancedField>((kind) => ({ path: `statements.name.${kind.id}`, group: "statements", kind: "text" })),

  { path: "bibliography.title", group: "bibliography", kind: "text" },
  { path: "bibliography.full", group: "bibliography", kind: "bool" },
];

export type AdvancedValue = string | number | boolean | string[] | number[];

/** Overrides written in config.yml, by path. Fields that are not set are left out. */
export type AdvancedValues = Record<string, AdvancedValue>;

const FIELD_BY_PATH = new Map(ADVANCED_FIELDS.map((field) => [field.path, field]));

export function advancedField(path: string): AdvancedField | undefined {
  return FIELD_BY_PATH.get(path);
}

/** True when the value has the shape and range that the field allows. */
export function isValidAdvanced(field: AdvancedField, value: unknown): boolean {
  const inRange = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n) && n >= (field.min ?? -Infinity) && n <= (field.max ?? Infinity);
  switch (field.kind) {
    case "number":
      return inRange(value);
    case "text":
      return typeof value === "string";
    case "bool":
      return typeof value === "boolean";
    case "select":
      return typeof value === "string" && (field.options ?? []).includes(value);
    case "list":
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => typeof item === "string" && item.trim() !== "" && (field.options === undefined || field.options.includes(item)))
      );
    case "numbers4":
      return Array.isArray(value) && value.length === 4 && value.every(inRange);
    case "select4":
      return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === "string" && (field.options ?? []).includes(item));
  }
}

function toPlain(value: unknown): unknown {
  return value !== null && typeof value === "object" && typeof (value as { toJSON?: () => unknown }).toJSON === "function"
    ? (value as { toJSON: () => unknown }).toJSON()
    : value;
}

/** Reads the overrides that config.yml sets. Values of the wrong shape are ignored. */
export function readAdvanced(text: string): AdvancedValues {
  const doc = parseDocument(text);
  const out: AdvancedValues = {};
  for (const field of ADVANCED_FIELDS) {
    const path = field.path.split(".");
    if (!doc.hasIn(path)) continue;
    const value = toPlain(doc.getIn(path, true));
    if (isValidAdvanced(field, value)) out[field.path] = value as AdvancedValue;
  }
  return out;
}

function setNested(doc: Document, path: string[], value: unknown): void {
  // Every missing section on the way is created, so a deep path never fails
  for (let depth = 1; depth < path.length; depth += 1) {
    const section = path.slice(0, depth);
    if (!doc.hasIn(section) || doc.getIn(section) === null) doc.setIn(section, doc.createNode({}));
  }
  doc.setIn(path, value);
}

function removeNested(doc: Document, path: string[]): void {
  if (!doc.hasIn(path)) return;
  doc.deleteIn(path);
  // Sections that became empty are removed too
  for (let depth = path.length - 1; depth >= 1; depth -= 1) {
    const section = path.slice(0, depth);
    const node = doc.getIn(section, true) as { items?: unknown[] } | null;
    if (node && Array.isArray(node.items) && node.items.length === 0) doc.deleteIn(section);
    else break;
  }
}

/**
 * Writes overrides back into config.yml. A path with a value is set, a path with undefined is removed,
 * so the school preset and the template defaults apply again. Other keys and comments stay as they are.
 */
export function writeAdvanced(text: string, values: Record<string, AdvancedValue | undefined>): string {
  const doc = text.trim() === "" ? new Document({}) : parseDocument(text);
  for (const [path, value] of Object.entries(values)) {
    const field = advancedField(path);
    if (!field) continue;
    if (value === undefined) removeNested(doc, path.split("."));
    else if (isValidAdvanced(field, value)) setNested(doc, path.split("."), value);
  }
  return doc.toString({ lineWidth: 0 });
}

/** Merges the template defaults, the school preset and then the project, later wins, tables merge by key. */
export function mergeConfigs(...layers: unknown[]): Record<string, unknown> {
  const merge = (base: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> => {
    const out = { ...base };
    for (const [key, value] of Object.entries(extra)) {
      const current = out[key];
      out[key] =
        value !== null && typeof value === "object" && !Array.isArray(value) && current !== null && typeof current === "object" && !Array.isArray(current)
          ? merge(current as Record<string, unknown>, value as Record<string, unknown>)
          : value;
    }
    return out;
  };
  return layers.reduce<Record<string, unknown>>((acc, layer) => (layer && typeof layer === "object" ? merge(acc, layer as Record<string, unknown>) : acc), {});
}

/** Looks up a dotted path in plain data. */
export function getPath(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), data);
}

/** What each advanced field would be without an override: the template defaults, then the school preset. */
export function inheritedValues(defaultText: string, schoolText: string | null): AdvancedValues {
  const layers = [defaultText, schoolText ?? ""].map((text) => toPlain(parseDocument(text).toJSON()));
  const merged = mergeConfigs({ placement: DEFAULT_PLACEMENT }, ...layers);
  const out: AdvancedValues = {};
  for (const field of ADVANCED_FIELDS) {
    const value = getPath(merged, field.path);
    if (isValidAdvanced(field, value)) out[field.path] = value as AdvancedValue;
    else if (field.kind === "list" && typeof value === "string") out[field.path] = [value];
  }
  return out;
}
