import { parseAttributes, type Attributes } from "../attributes";
import { fenceMarker, isFenceClose } from "../fence";
import type { MarkdownItInstance } from "../markdown-it";

type StateBlock = InstanceType<MarkdownItInstance["block"]["State"]>;

/** Opening fence, three or more colons followed by attributes or one word. */
const OPENING = /^(:{3,})\s*(\S.*)$/;
const CLOSING = /^:{3,}\s*$/;

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
 * Fenced div:
 *
 *     ::: {#fig:row .figrow}
 *     …content…
 *     :::
 *
 * It may nest, matched by opening and closing lines, and a ::: inside a code fence does not count.
 * Without a closing line it is not a div. Same rule as splitBlocks.
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
      if (isFenceClose(text, fence)) fence = null;
      continue;
    }
    const opening = fenceMarker(text);
    if (opening) {
      fence = opening;
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
