import { parseDocument, Document } from "yaml";
import { isKnownSchool } from "./schools";

/** Fields of the project settings form, part of config.yml and other fields are kept as they are. */
export type ConfigFields = {
  /** School code, an empty string means no school preset */
  school: string;
  title: string;
  titleEn: string;
  author: string;
  authorEn: string;
  id: string;
  advisor: string;
  advisorEn: string;
  college: string;
  collegeEn: string;
  institute: string;
  instituteEn: string;
  degree: string;
  degreeEn: string;
  type: string;
  typeEn: string;
  /** Publication date YYYY-MM-DD */
  date: string;
  /** Defense date YYYY-MM-DD */
  oralDate: string;
  keywords: string[];
  keywordsEn: string[];
};

type StringField = {
  [K in keyof ConfigFields]: ConfigFields[K] extends string ? K : never;
}[keyof ConfigFields];

/** Maps field names to keys of config.yml, the template uses kebab-case. */
const YAML_KEYS: Record<keyof ConfigFields, string> = {
  school: "school",
  title: "title",
  titleEn: "title-en",
  author: "author",
  authorEn: "author-en",
  id: "id",
  advisor: "advisor",
  advisorEn: "advisor-en",
  college: "college",
  collegeEn: "college-en",
  institute: "institute",
  instituteEn: "institute-en",
  degree: "degree",
  degreeEn: "degree-en",
  type: "type",
  typeEn: "type-en",
  date: "date",
  oralDate: "oral-date",
  keywords: "keywords",
  keywordsEn: "keywords-en",
};

const STRING_FIELDS: readonly StringField[] = [
  "school",
  "title",
  "titleEn",
  "author",
  "authorEn",
  "id",
  "advisor",
  "advisorEn",
  "college",
  "collegeEn",
  "institute",
  "instituteEn",
  "degree",
  "degreeEn",
  "type",
  "typeEn",
  "date",
  "oralDate",
];

export function defaultFields(): ConfigFields {
  return {
    school: "",
    title: "",
    titleEn: "",
    author: "",
    authorEn: "",
    id: "",
    advisor: "",
    advisorEn: "",
    college: "",
    collegeEn: "",
    institute: "",
    instituteEn: "",
    degree: "碩士",
    degreeEn: "Master",
    type: "論文",
    typeEn: "Thesis",
    date: "",
    oralDate: "",
    keywords: [],
    keywordsEn: [],
  };
}

export class ConfigParseError extends Error {}

function parse(text: string): Document {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new ConfigParseError(doc.errors[0]?.message ?? "invalid YAML");
  return doc;
}

function asString(value: unknown): string {
  // YAML reads dates and numbers as other types, a numeric student id must stay a string
  return value === null || value === undefined ? "" : String(value);
}

/** Reads the form fields from the text of config.yml, missing fields use defaults. */
export function readConfig(text: string): ConfigFields {
  const doc = parse(text);
  const fields = defaultFields();
  for (const name of STRING_FIELDS) {
    const value = doc.get(YAML_KEYS[name]);
    if (value !== undefined && value !== null) fields[name] = asString(value);
  }
  for (const name of ["keywords", "keywordsEn"] as const) {
    const value = doc.get(YAML_KEYS[name], true);
    const items = value && typeof (value as { toJSON?: () => unknown }).toJSON === "function"
      ? (value as { toJSON: () => unknown }).toJSON()
      : value;
    if (Array.isArray(items)) fields[name] = items.map(asString);
  }
  return fields;
}

/**
 * Writes the form fields back into the text of config.yml, only keys of the form change and other keys and comments are kept.
 * Empty strings and empty arrays delete the key so school and template defaults apply.
 */
export function writeConfig(text: string, fields: ConfigFields): string {
  const doc = text.trim() === "" ? new Document({}) : parse(text);
  for (const name of STRING_FIELDS) {
    const value = fields[name].trim();
    if (value === "") doc.delete(YAML_KEYS[name]);
    else doc.set(YAML_KEYS[name], value);
  }
  for (const name of ["keywords", "keywordsEn"] as const) {
    const items = fields[name].map((item) => item.trim()).filter(Boolean);
    if (items.length === 0) doc.delete(YAML_KEYS[name]);
    else doc.set(YAML_KEYS[name], items);
  }
  return doc.toString({ lineWidth: 0 });
}

export type ConfigIssue = {
  field: keyof ConfigFields;
  code: "required" | "date-format" | "unknown-school";
};

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Validates the form, title and author are required, dates must be valid and the school code must exist. */
export function validateConfig(fields: ConfigFields): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  for (const field of ["title", "author"] as const) {
    if (fields[field].trim() === "") issues.push({ field, code: "required" });
  }
  for (const field of ["date", "oralDate"] as const) {
    const value = fields[field].trim();
    if (value !== "" && !isIsoDate(value)) issues.push({ field, code: "date-format" });
  }
  if (fields.school !== "" && !isKnownSchool(fields.school)) {
    issues.push({ field: "school", code: "unknown-school" });
  }
  return issues;
}
