/** Characters that are special in Typst markup mode always get a backslash. */
const MARKUP_SPECIAL = /[\\#$*_`<@[\]~/]/g;

export function escapeMarkup(text: string): string {
  return text
    .replace(MARKUP_SPECIAL, (ch) => `\\${ch}`)
    .replace(/^(\s*)([=\-+])(?=\s|$)/gm, "$1\\$2") // heading and list markers at line start
    .replace(/^(\s*)(\d+)\.(?=\s)/gm, "$1$2\\."); // numbered list marker at line start
}

/** Escapes inside Typst strings in double quotes. */
export function escapeString(text: string): string {
  return text.replace(/[\\"]/g, (ch) => `\\${ch}`).replace(/\n/g, "\\n");
}

/** Number of backticks for a fence, one more than the longest run in the content and at least three. */
export function fenceFor(text: string): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  return "`".repeat(Math.max(3, longest + 1));
}

/** Zero width space, placed between the closing bracket of a function call and a following opening parenthesis so it is not taken as an argument list. */
export const ZWSP = "​";

/** Image width accepts only a number with a unit and anything else is dropped, so arbitrary text never enters Typst code. */
export function safeLength(width: string | null): string | null {
  return width !== null && /^\d+(\.\d+)?(%|pt|cm|mm|in|em)$/.test(width) ? width : null;
}
