import { parseAttributes, type Attributes } from "../attributes";
import type { MarkdownItInstance } from "../markdown-it";

type StateBlock = InstanceType<MarkdownItInstance["block"]["State"]>;

/** 開頭的圍欄：三個以上的冒號，後面接屬性或一個單字。 */
const OPENING = /^(:{3,})\s*(\S.*)$/;
const CLOSING = /^:{3,}\s*$/;
const FENCE = /^(`{3,}|~{3,})/;

function lineText(state: StateBlock, line: number): string {
  return state.src.slice((state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0), state.eMarks[line] ?? 0);
}

function parseOpening(rest: string): Attributes | null {
  const trimmed = rest.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return parseAttributes(trimmed.slice(1, -1));
  if (/^[A-Za-z_][\w-]*$/.test(trimmed)) return { id: null, classes: [trimmed], props: {} };
  return null;
}

/**
 * 圍欄 div：
 *
 *     ::: {#fig:row .figrow}
 *     …內容…
 *     :::
 *
 * 可以巢狀（以開頭與結尾的行數配對）；程式碼圍欄裡的 `:::` 不算。
 * 沒有結尾時不是 div。與 `splitBlocks` 的規則一致。
 */
function div(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if ((state.sCount[startLine] ?? 0) - state.blkIndent >= 4) return false;
  const opening = OPENING.exec(lineText(state, startLine));
  if (!opening) return false;
  const attributes = parseOpening(opening[2] ?? "");
  if (!attributes) return false;

  let depth = 1;
  let fence: string | null = null;
  let line = startLine + 1;
  for (; line < endLine; line += 1) {
    const text = lineText(state, line);
    if (fence !== null) {
      const bare = text.trim();
      if (bare.length >= fence.length && bare === fence.charAt(0).repeat(bare.length)) fence = null;
      continue;
    }
    const fenceOpen = FENCE.exec(text);
    if (fenceOpen) {
      fence = fenceOpen[1] ?? null;
    } else if (CLOSING.test(text)) {
      depth -= 1;
      if (depth === 0) break;
    } else if (OPENING.test(text)) {
      depth += 1;
    }
  }
  if (depth !== 0) return false;
  if (silent) return true;

  const parentType = state.parentType;
  const lineMax = state.lineMax;
  state.parentType = "container" as typeof state.parentType;
  state.lineMax = line;

  const open = state.push("div_open", "div", 1);
  open.markup = ":::";
  open.block = true;
  open.map = [startLine, line];
  open.meta = { id: attributes.id, classes: attributes.classes, props: attributes.props };

  state.md.block.tokenize(state, startLine + 1, line);

  const close = state.push("div_close", "div", -1);
  close.markup = ":::";
  close.block = true;

  state.parentType = parentType;
  state.lineMax = lineMax;
  state.line = line + 1;
  return true;
}

export function divPlugin(md: MarkdownItInstance): void {
  md.block.ruler.before("fence", "div", div, { alt: ["paragraph", "reference", "blockquote", "list"] });
}
