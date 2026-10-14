import { parseAttributes } from "../attributes";
import type { MarkdownItInstance } from "../markdown-it";

type StateBlock = InstanceType<MarkdownItInstance["block"]["State"]>;
type StateInline = InstanceType<MarkdownItInstance["inline"]["State"]>;

const DOLLAR = 0x24;
const BACKSLASH = 0x5c;

/** Closing line of a block formula, $$ optionally followed by {#eq:x}. */
const CLOSING_LINE = /^\$\$\s*(?:\{([^}]*)\})?\s*$/;
/** A single line block formula, $$ … $$ optionally followed by {#eq:x}. */
const SINGLE_LINE = /^\$\$(.+?)\$\$\s*(?:\{([^}]*)\})?\s*$/;

function lineText(state: StateBlock, line: number): string {
  return state.src.slice((state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0), state.eMarks[line] ?? 0);
}

/**
 * Block formula:
 *
 *     $$
 *     E = mc^2
 *     $$ {#eq:one}
 *
 * or a single line $$ E = mc^2 $$ {#eq:one}. The label goes into the id attribute of the token.
 */
function mathBlock(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if ((state.sCount[startLine] ?? 0) - state.blkIndent >= 4) return false;
  const first = lineText(state, startLine);
  if (!first.startsWith("$$")) return false;

  let latex: string;
  let attributeText = "";
  let nextLine: number;

  const single = SINGLE_LINE.exec(first);
  if (single && (single[1] ?? "").trim() !== "") {
    latex = single[1] ?? "";
    attributeText = single[2] ?? "";
    nextLine = startLine + 1;
  } else if (first.trim() === "$$") {
    let line = startLine + 1;
    let closing: RegExpExecArray | null = null;
    for (; line < endLine; line += 1) {
      closing = CLOSING_LINE.exec(lineText(state, line));
      if (closing) break;
    }
    if (!closing) return false;
    latex = state.getLines(startLine + 1, line, state.blkIndent, false);
    attributeText = closing[1] ?? "";
    nextLine = line + 1;
  } else {
    return false;
  }

  if (silent) return true;

  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.markup = "$$";
  token.content = latex.trim();
  token.map = [startLine, nextLine];
  const id = attributeText ? parseAttributes(attributeText)?.id : null;
  if (id) token.attrSet("id", id);

  state.line = nextLine;
  return true;
}

/**
 * Inline formula $…$, the opening $ is not followed by a space and the closing $ is not preceded by one,
 * it does not span lines and the content is kept as written, \$ stays \$. Prices such as $5 and $6 are not formulas
 * because the closing $ there is preceded by a space.
 */
function mathInline(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  const src = state.src;
  if (src.charCodeAt(start) !== DOLLAR) return false;

  const next = src.charAt(start + 1);
  if (next === "" || next === "$" || /\s/.test(next)) return false;

  let end = start + 1;
  while (end < state.posMax) {
    const code = src.charCodeAt(end);
    if (code === BACKSLASH) {
      end += 2;
      continue;
    }
    if (code === DOLLAR) break;
    if (src.charAt(end) === "\n") return false;
    end += 1;
  }
  if (end >= state.posMax || src.charCodeAt(end) !== DOLLAR) return false;
  if (/\s/.test(src.charAt(end - 1))) return false;

  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.markup = "$";
    token.content = src.slice(start + 1, end);
  }
  state.pos = end + 1;
  return true;
}

export function mathPlugin(md: MarkdownItInstance): void {
  md.block.ruler.before("fence", "math_block", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.inline.ruler.after("escape", "math_inline", mathInline);
}
