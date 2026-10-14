export type EscapeContext = {
  /** Whether this text is at the start of a line, paragraph start, list item start or after a hard break */
  startOfLine: boolean;
  /** Whether inside a heading, a trailing run of # at the end of a heading is taken as a closing marker */
  inHeading: boolean;
  /** Whether inside a table cell, | separates columns */
  inTableCell?: boolean;
};

/** Looks like a character entity &…; such as &amp;, &#35; or &#x23;. */
const ENTITY = /^&(#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/;

/**
 * An @ followed by a word character or a brace and not preceded by a word character may be taken as a citation or cross-reference, see section 4.3 of the spec.
 * An @ inside a word such as an email address and a lone @ need no escape.
 */
function startsCitation(text: string, index: number): boolean {
  const previous = index > 0 ? text.charAt(index - 1) : "";
  const next = text.charAt(index + 1);
  return !/\w/.test(previous) && (/\w/.test(next) || next === "{");
}

/**
 * Escapes plain text into Markdown that is not parsed as markup. It covers the inline and line start rules of CommonMark
 * plus attributes {…}, the formula $ and the line start : of fenced divs and definition lists of this dialect, see section 4.3 of the spec.
 * The round trip property tests check that any text escaped and parsed again gives the original text.
 */
export function escapeText(text: string, context: EscapeContext): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);

    if ("`*\\~[]<{}$".includes(ch)) {
      out += `\\${ch}`;
    } else if (ch === "_") {
      // An underscore inside a word such as snake_case needs no escape, neighbours must be alphanumeric and consecutive underscores do not count for each other
      const intraword =
        i > 0 &&
        i + 1 < text.length &&
        /[A-Za-z0-9]/.test(text.charAt(i - 1)) &&
        /[A-Za-z0-9]/.test(text.charAt(i + 1));
      out += intraword ? ch : "\\_";
    } else if (ch === "@" && startsCitation(text, i)) {
      out += "\\@";
    } else if (ch === "&" && ENTITY.test(text.slice(i))) {
      out += "\\&";
    } else if (ch === "|" && context.inTableCell) {
      out += "\\|";
    } else if (ch === "#" && context.inHeading) {
      out += "\\#";
    } else {
      out += ch;
    }
  }

  return context.startOfLine ? escapeLineStart(out) : out;
}

/** Characters at line start that would be taken as block markers, heading, list, quote, definition or div fence, must be escaped. */
export function escapeLineStart(text: string): string {
  return text
    .replace(/^(\s*)(#{1,6})(\s|$)/, "$1\\$2$3")
    .replace(/^([+\-=>:])/, "\\$1")
    .replace(/^(\d+)([.)])/, "$1\\$2");
}
