/** The language of the texts of a template, the same names as the locales of the app. */
export type Language = "zh-Hant" | "en";
export const LANGUAGES: readonly Language[] = ["zh-Hant", "en"];

export type Localized = Record<Language, string>;

export type Param =
  | { type: "int"; default: number; min: number; max: number; label: Localized }
  | { type: "bool"; default: boolean; label: Localized };

export type ParamValue = number | boolean;

/** A template file: a shape, the parameters of it, and the texts. A template is data, so a new one is a new file. */
export type Template = {
  id: string;
  field: string;
  shape: string;
  title: Localized;
  description: Localized;
  tags: string[];
  params: Record<string, Param>;
  /** The texts that the shape writes into the table, for each language */
  labels: Record<Language, Record<string, string>>;
  /** What the template needs from the table model that may be missing in an output, empty when it needs nothing special */
  needs: string[];
};

export type Field = {
  id: string;
  name: Localized;
  order: number;
};

const isLocalized = (value: unknown): value is Localized =>
  typeof value === "object" && value !== null && LANGUAGES.every((language) => typeof (value as Record<string, unknown>)[language] === "string" && (value as Record<string, string>)[language] !== "");

/** Checks a template file and says what is wrong with it, an empty list means it is valid. */
export function validateTemplate(value: unknown, shapes: readonly string[]): string[] {
  const problems: string[] = [];
  if (typeof value !== "object" || value === null) return ["the file is not an object"];
  const t = value as Partial<Template>;
  if (typeof t.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id)) problems.push("id must be lower case words joined by dashes");
  if (typeof t.field !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.field)) problems.push("field must be lower case words joined by dashes");
  if (typeof t.shape !== "string" || !shapes.includes(t.shape)) problems.push(`shape must be one of ${shapes.join(", ")}`);
  if (!isLocalized(t.title)) problems.push("title needs both languages");
  if (!isLocalized(t.description)) problems.push("description needs both languages");
  if (!Array.isArray(t.tags) || t.tags.some((tag) => typeof tag !== "string")) problems.push("tags must be a list of texts");
  if (!Array.isArray(t.needs) || t.needs.some((need) => typeof need !== "string")) problems.push("needs must be a list of texts");

  if (typeof t.params !== "object" || t.params === null) problems.push("params must be an object");
  else {
    for (const [name, param] of Object.entries(t.params)) {
      const p = param as Partial<Param> & { min?: number; max?: number; default?: unknown };
      if (!isLocalized(p.label)) problems.push(`param ${name} needs a label in both languages`);
      if (p.type === "int") {
        if (!Number.isInteger(p.min) || !Number.isInteger(p.max) || (p.min as number) > (p.max as number)) problems.push(`param ${name} needs whole number limits`);
        else if (!Number.isInteger(p.default) || (p.default as number) < (p.min as number) || (p.default as number) > (p.max as number)) problems.push(`param ${name} has a default outside its limits`);
      } else if (p.type === "bool") {
        if (typeof p.default !== "boolean") problems.push(`param ${name} needs true or false as its default`);
      } else problems.push(`param ${name} has an unknown type`);
    }
  }

  if (typeof t.labels !== "object" || t.labels === null) problems.push("labels must be an object");
  else {
    const keys = LANGUAGES.map((language) => Object.keys((t.labels as Record<string, Record<string, string>>)[language] ?? {}).sort().join(","));
    if (keys.some((key) => key === "")) problems.push("labels need both languages");
    else if (new Set(keys).size > 1) problems.push("labels must have the same names in both languages");
  }
  return problems;
}

export function validateField(value: unknown): string[] {
  if (typeof value !== "object" || value === null) return ["the file is not an object"];
  const f = value as Partial<Field>;
  const problems: string[] = [];
  if (typeof f.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.id)) problems.push("id must be lower case words joined by dashes");
  if (!isLocalized(f.name)) problems.push("name needs both languages");
  if (!Number.isFinite(f.order)) problems.push("order must be a number");
  return problems;
}

/** The values of the parameters of a template with defaults for the missing ones, and every number held to its limits. */
export function resolveParams(template: Template, given: Record<string, ParamValue | undefined> = {}): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const [name, param] of Object.entries(template.params)) {
    const value = given[name];
    if (param.type === "bool") out[name] = typeof value === "boolean" ? value : param.default;
    else out[name] = typeof value === "number" && Number.isFinite(value) ? Math.min(param.max, Math.max(param.min, Math.round(value))) : param.default;
  }
  return out;
}
