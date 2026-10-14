import type { MarkdownItInstance } from "../markdown-it";

type StateBlock = InstanceType<MarkdownItInstance["block"]["State"]>;

/**
 * Definition list:
 *
 *     term
 *     : description, later lines and paragraphs are indented by two spaces
 *
 * Only : is a definition marker. markdown-it-deflist is not used, it also takes ~ as a marker and while scanning
 * inside a list it does not let code fences and other rules go first, so lines starting with ~ in a code block are misjudged.
 */

const DEFINITION = /^:[ \t]/;
/** Lines starting like this are other kinds of blocks and cannot be a term. */
const BLOCK_START = /^(?:```|~~~|#{1,6}(?:\s|$)|[-*+]\s|\d+[.)]\s|>|:::|\$\$|-{3,}|\*{3,}|_{3,})/;

function rawLine(state: StateBlock, line: number): string {
  return state.src.slice(state.bMarks[line] ?? 0, state.eMarks[line] ?? 0);
}

function lineText(state: StateBlock, line: number): string {
  return state.src.slice((state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0), state.eMarks[line] ?? 0);
}

function isBlank(state: StateBlock, line: number): boolean {
  return lineText(state, line).trim() === "";
}

function isDefinition(state: StateBlock, line: number): boolean {
  return (state.sCount[line] ?? 0) - state.blkIndent < 4 && DEFINITION.test(lineText(state, line));
}

function isTerm(state: StateBlock, line: number, endLine: number): boolean {
  const text = lineText(state, line);
  return (
    line + 1 < endLine &&
    text.trim() !== "" &&
    !BLOCK_START.test(text) &&
    !isDefinition(state, line) &&
    isDefinition(state, line + 1)
  );
}

/** Collects one description from a line starting with ": ", following lines indented by two spaces belong to it, and a blank line counts only if an indented line follows. */
function collectDescription(state: StateBlock, start: number, endLine: number): { source: string; next: number } {
  const lines = [lineText(state, start).replace(DEFINITION, "")];
  let line = start + 1;
  let lastContent = start;

  while (line < endLine) {
    const raw = rawLine(state, line);
    if (raw.trim() === "") {
      line += 1;
      continue;
    }
    if (!/^(?: {2}|\t)/.test(raw)) break;
    // Add back the blank lines in between
    while (lines.length < line - start) lines.push("");
    lines.push(raw.replace(/^(?: {2}|\t)/, ""));
    lastContent = line;
    line += 1;
  }
  return { source: lines.join("\n"), next: lastContent + 1 };
}

function deflist(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if ((state.sCount[startLine] ?? 0) - state.blkIndent >= 4) return false;
  if (!isTerm(state, startLine, endLine)) return false;
  if (silent) return true;

  const open = state.push("dl_open", "dl", 1);
  open.block = true;
  open.map = [startLine, startLine];

  let line = startLine;
  let end = startLine;

  while (line < endLine && isTerm(state, line, endLine)) {
    const dtOpen = state.push("dt_open", "dt", 1);
    dtOpen.block = true;
    const inline = state.push("inline", "", 0);
    inline.content = lineText(state, line).trim();
    inline.map = [line, line + 1];
    inline.children = [];
    const dtClose = state.push("dt_close", "dt", -1);
    dtClose.block = true;
    line += 1;

    while (line < endLine && isDefinition(state, line)) {
      const { source, next } = collectDescription(state, line, endLine);
      const ddOpen = state.push("dd_open", "dd", 1);
      ddOpen.block = true;

      const inner: typeof state.tokens = [];
      state.md.block.parse(source, state.md, state.env, inner);
      for (const token of inner) state.tokens.push(token);

      const ddClose = state.push("dd_close", "dd", -1);
      ddClose.block = true;
      end = next;
      line = next;
    }

    // A blank line may come before the term of the next group
    let following = line;
    while (following < endLine && isBlank(state, following)) following += 1;
    if (following < endLine && isTerm(state, following, endLine)) line = following;
    else break;
  }

  const close = state.push("dl_close", "dl", -1);
  close.block = true;
  open.map = [startLine, end];
  state.line = end;
  return true;
}

export function deflistPlugin(md: MarkdownItInstance): void {
  md.block.ruler.before("paragraph", "deflist", deflist, { alt: ["paragraph"] });
}
