import departments from "./departments.json";

export type Named = { zh: string; en: string };
export type College = Named & { departments: Named[] };

/**
 * Colleges and departments of each school, from the data of the tw-thesis-tui project.
 * Checked against the 114 academic year lists of the Ministry of Education.
 */
const DATA = departments as Record<string, College[]>;

export function collegesOf(school: string): College[] {
  return DATA[school] ?? [];
}

export function departmentsOf(school: string, collegeZh: string): Named[] {
  return collegesOf(school).find((college) => college.zh === collegeZh)?.departments ?? [];
}

export function findCollege(school: string, zh: string): College | undefined {
  return collegesOf(school).find((college) => college.zh === zh);
}

export function findDepartment(school: string, zh: string): Named | undefined {
  return collegesOf(school)
    .flatMap((college) => college.departments)
    .find((department) => department.zh === zh);
}

export const DEGREES: readonly Named[] = [
  { zh: "碩士", en: "Master" },
  { zh: "博士", en: "Doctor" },
];

export const DOCUMENT_TYPES: readonly Named[] = [
  { zh: "論文", en: "Thesis" },
  { zh: "學位論文", en: "Dissertation" },
];

export const LANGUAGES = ["chinese", "english"] as const;

/** Citation styles offered in the settings, the first column is the CSL name that the template reads. */
export const CITATION_STYLES = [
  "apa",
  "harvard-cite-them-right",
  "chicago-author-date",
  "mla",
  "ieee",
  "vancouver",
] as const;
