import type { ConfigFields } from "@marktwain/schema";

/** What is true of the author for every thesis, kept in the app so it is typed once. */
export type AuthorProfile = {
  school: string;
  college: string;
  collegeEn: string;
  institute: string;
  instituteEn: string;
  degree: string;
  degreeEn: string;
  author: string;
  authorEn: string;
  id: string;
  /** chinese, english, or empty to follow the school */
  language: string;
  /** Whether the dialog of a new project asks for it */
  ask: boolean;
};

export const PROFILE_TEXT_FIELDS = ["school", "college", "collegeEn", "institute", "instituteEn", "degree", "degreeEn", "author", "authorEn", "id", "language"] as const;

export const DEFAULT_PROFILE: AuthorProfile = {
  school: "",
  college: "",
  collegeEn: "",
  institute: "",
  instituteEn: "",
  degree: "",
  degreeEn: "",
  author: "",
  authorEn: "",
  id: "",
  language: "",
  ask: true,
};

const MAX_LENGTH = 200;

/** Takes what a file or a patch holds and keeps the fields that are text of a sane length. */
export function sanitizeProfile(raw: unknown, base: AuthorProfile = DEFAULT_PROFILE): AuthorProfile {
  const data = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next: AuthorProfile = { ...base };
  for (const field of PROFILE_TEXT_FIELDS) {
    const value = data[field];
    if (typeof value === "string") next[field] = value.trim().slice(0, MAX_LENGTH);
  }
  if (typeof data.ask === "boolean") next.ask = data.ask;
  return next;
}

/** True when nothing about the author is known yet. */
export function isEmptyProfile(profile: AuthorProfile): boolean {
  return PROFILE_TEXT_FIELDS.every((field) => profile[field] === "");
}

/** The settings of a thesis with the known facts of the author filled in, what the thesis already has is kept. */
export function applyProfile(fields: ConfigFields, profile: AuthorProfile): ConfigFields {
  const next = { ...fields };
  for (const field of PROFILE_TEXT_FIELDS) {
    if (profile[field] !== "" && next[field] === "") next[field] = profile[field];
  }
  return next;
}

/** The facts of the author in the settings of a thesis, as a profile. */
export function profileFromFields(fields: ConfigFields, ask: boolean): AuthorProfile {
  const profile = { ...DEFAULT_PROFILE, ask };
  for (const field of PROFILE_TEXT_FIELDS) profile[field] = fields[field];
  return profile;
}
