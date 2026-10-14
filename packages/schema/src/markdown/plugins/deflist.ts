import type { MarkdownItInstance } from "../markdown-it";

type StateBlock = InstanceType<MarkdownItInstance["block"]["State"]>;

/**
 * 定義清單：
 *
 *     詞
 *     : 說明（後續的行與段落縮排兩格）
 *
 * 只認 `:` 當定義記號。不用 markdown-it-deflist：它也把 `~` 當記號，而且在清單內部
 * 往下掃描時不讓程式碼圍欄等規則優先，所以程式碼區塊裡以 `~` 開頭的行會被誤判。
 */

const DEFINITION = /^:[ \t]/;
/** 這些開頭的行是別種區塊，不能當成「詞」。 */
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

/** 從 `: ` 那一行開始收集一個說明：後續縮排兩格的行屬於它，空行只在後面還有縮排的行時才算。 */
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
    // 補上中間的空行
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

    // 下一組的詞之前可以有空行
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
