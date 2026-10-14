import { parseDocument, Document } from "yaml";
import { isKnownSchool } from "./schools";

/** 專案設定表單的欄位（`config.yml` 的一部分；其餘欄位原樣保留）。 */
export type ConfigFields = {
  /** 學校代碼；空字串表示不使用學校預設 */
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
  /** 出版日期 YYYY-MM-DD */
  date: string;
  /** 口試日期 YYYY-MM-DD */
  oralDate: string;
  keywords: string[];
  keywordsEn: string[];
};

type StringField = {
  [K in keyof ConfigFields]: ConfigFields[K] extends string ? K : never;
}[keyof ConfigFields];

/** 欄位名稱對應 config.yml 的鍵（模板用 kebab-case）。 */
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
  // YAML 會把 2024-01-05 這種寫法讀成 Date 以外的字串；數字型的學號也要保留成字串
  return value === null || value === undefined ? "" : String(value);
}

/** 從 config.yml 的文字讀出表單欄位；沒有的欄位用預設值。 */
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
 * 把表單欄位寫回 config.yml 的文字：只改表單管的鍵，其他鍵與註解原樣保留。
 * 空字串與空陣列會刪掉該鍵，讓學校預設與模板預設生效。
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

/** 表單欄位的驗證：題目與作者必填、日期格式、學校代碼存在。 */
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
