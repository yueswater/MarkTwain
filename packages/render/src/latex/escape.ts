const SPECIAL: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "^": "\\^{}",
  _: "\\_",
  "%": "\\%",
  "~": "\\textasciitilde{}",
  // A bracket right after a line break or an item would be read as an optional argument
  "[": "{[}",
  "]": "{]}",
};

/** Straight quotes become curly ones, an opening quote follows the start, a space or an opening bracket. */
function curlyQuotes(text: string): string {
  return text
    .replace(/(^|[\s([{（「『])"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s([{（「『“])'/g, "$1‘")
    .replace(/'/g, "’");
}

/** Escapes the characters that LaTeX reads as commands in running text. */
export function escapeTex(text: string): string {
  return curlyQuotes(text)
    .replace(/[\\{}$&#^_%~[\]]/g, (ch) => SPECIAL[ch] ?? ch)
    .replace(/\u00a0/g, "~");
}

/** Text in a monospace run, where hyphens and quotes must stay as typed. */
export function escapeCode(text: string): string {
  return text
    .replace(/[\\{}$&#^_%~[\]]/g, (ch) => SPECIAL[ch] ?? ch)
    .replace(/-/g, "{-}")
    .replace(/`/g, "{`}")
    .replace(/'/g, "{'}")
    .replace(/\u00a0/g, "~")
    .replace(/\n/g, " ");
}

/** An address for \href, characters that break the argument are percent encoded, then the percent sign and the hash are escaped for LaTeX. */
export function escapeUrl(url: string): string {
  return url
    .replace(/[\s{}\\^|<>"]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`)
    .replace(/[%#]/g, (ch) => `\\${ch}`);
}

/** Image width as a TeX length, a percentage is a share of the line and anything else than a number with a unit is dropped. */
export function texLength(width: string | null): string | null {
  if (width === null) return null;
  const match = /^(\d+(?:\.\d+)?)(%|pt|cm|mm|in|em)$/.exec(width);
  if (!match) return null;
  const [, value = "", unit = ""] = match;
  return unit === "%" ? `${Number((Number(value) / 100).toFixed(4))}\\linewidth` : `${value}${unit}`;
}

/** A citation key that is safe inside the argument of a citation command. */
export function safeKey(key: string): string {
  return key.replace(/[\s{},%#\\]/g, "_");
}

/** The line that ends a lstlisting, content that holds it needs another environment. */
export const CODE_END = "\\end{lstlisting}";
