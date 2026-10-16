import type { ConfigFields } from "@marktwain/schema";

/**
 * What the cover and the pages before the thesis print from the settings, in the order of the form. English names are asked too,
 * since the cover has an English side. The school is not one of them, but a thesis with none has the default format.
 */
const NEEDED: readonly (keyof ConfigFields)[] = [
  "title",
  "titleEn",
  "author",
  "authorEn",
  "id",
  "advisor",
  "advisorEn",
  "college",
  "institute",
  "degree",
  "date",
  "oralDate",
  "keywords",
  "keywordsEn",
];

/** The fields that are empty, as names of fields of the settings. */
export function missingForSubmission(fields: ConfigFields): (keyof ConfigFields)[] {
  return NEEDED.filter((name) => {
    const value = fields[name];
    return Array.isArray(value) ? value.length === 0 : String(value ?? "").trim() === "";
  });
}
