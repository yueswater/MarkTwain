import { DocumentKind } from "./enums/document-kind.enum";

/** The language of the thesis, as the settings of the project write it. */
export type ThesisLanguage = "chinese" | "english";

const TITLES: Record<ThesisLanguage, { first: string; chapter: string; appendix: string }> = {
  chinese: { first: "緒論", chapter: "新的一章", appendix: "新的附錄" },
  english: { first: "Introduction", chapter: "New chapter", appendix: "New appendix" },
};

function languageOf(value: string): ThesisLanguage {
  return value === "english" ? "english" : "chinese";
}

/** The heading that a new chapter or appendix starts with, null for a kind that has no heading of its own. */
export function defaultHeading(kind: string, position: number, language: string): string | null {
  const titles = TITLES[languageOf(language)];
  if (kind === DocumentKind.Chapter) return position === 1 ? titles.first : titles.chapter;
  if (kind === DocumentKind.Appendix) return titles.appendix;
  return null;
}

/** The text of a new document: a first level heading with the default title, and nothing for a kind without one. */
export function defaultText(kind: string, position: number, language: string): string {
  const heading = defaultHeading(kind, position, language);
  return heading === null ? "" : `# ${heading}\n`;
}

/** The text that a document has while the person has not touched it, in a language, for any position. */
export function isUntouched(kind: string, text: string, language: string): boolean {
  if (kind !== DocumentKind.Chapter && kind !== DocumentKind.Appendix) return false;
  return [1, 2].some((position) => text === defaultText(kind, position, language));
}

/** Whether the text is the default of a new chapter or appendix in either language, nobody has written in it yet. */
export function isDefaultText(kind: string, text: string): boolean {
  return isUntouched(kind, text, "chinese") || isUntouched(kind, text, "english");
}
