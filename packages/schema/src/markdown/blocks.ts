import { fenceMarker, isFenceClose } from "./fence";

const DIV_OPEN = /^:{3,}\s*\S/;
const DIV_CLOSE = /^:{3,}\s*$/;

/**
 * Splits Markdown into top level blocks. Blocks are separated by blank lines, and these structures count as one block,
 * so blank lines inside them do not split: fenced code, block formulas wrapped by lines holding only $$,
 * and fenced divs with ::: which may nest. An unclosed structure runs to the end of the document.
 */
export function splitBlocks(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  let inMath = false;
  let divDepth = 0;

  const flush = (): void => {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of lines) {
    if (fence !== null) {
      current.push(line);
      if (isFenceClose(line, fence)) fence = null;
      continue;
    }

    if (inMath) {
      current.push(line);
      if (line.trim() === "$$") inMath = false;
      continue;
    }

    if (line.trim() === "") {
      if (divDepth === 0) flush();
      else current.push(line);
      continue;
    }

    const opening = fenceMarker(line);
    if (opening) {
      fence = opening;
    } else if (line.trim() === "$$") {
      inMath = true;
    } else if (DIV_OPEN.test(line)) {
      divDepth += 1;
    } else if (DIV_CLOSE.test(line)) {
      divDepth = Math.max(0, divDepth - 1);
    }
    current.push(line);
  }

  flush();
  return blocks;
}

/** Joins blocks with a single blank line and adds a trailing newline, an empty string when there are no blocks. */
export function joinBlocks(blocks: string[]): string {
  return blocks.length === 0 ? "" : `${blocks.join("\n\n")}\n`;
}
