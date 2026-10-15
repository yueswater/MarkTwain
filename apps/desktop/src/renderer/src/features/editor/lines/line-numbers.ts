export type Box = { top: number; bottom: number };

export type Line = { top: number; height: number };

/**
 * Groups the boxes of text and atoms into visual lines. Boxes that share most of their height are one line.
 * The result is in reading order, one entry per line.
 */
export function clusterLines(boxes: readonly Box[]): Line[] {
  const sorted = [...boxes].filter((box) => box.bottom > box.top).sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  const lines: { top: number; bottom: number }[] = [];
  for (const box of sorted) {
    const last = lines[lines.length - 1];
    if (last) {
      const overlap = Math.min(last.bottom, box.bottom) - Math.max(last.top, box.top);
      const smaller = Math.min(last.bottom - last.top, box.bottom - box.top);
      // A box on the same line shares at least half of the smaller height
      if (overlap >= smaller / 2) {
        last.top = Math.min(last.top, box.top);
        last.bottom = Math.max(last.bottom, box.bottom);
        continue;
      }
    }
    lines.push({ top: box.top, bottom: box.bottom });
  }
  return lines.map((line) => ({ top: line.top, height: line.bottom - line.top }));
}

const ATOMS = "img, svg, .katex, [data-type='inline-math'], [data-citation], [data-cross-ref], sup[data-footnote]";

/** Blocks whose lines are not numbered: tables, figures, code and display formulas count by themselves. */
const NOT_NUMBERED = "table, figure, .code-block, [data-type='block-math'], [data-node-view-wrapper] > pre, h1, h2, h3, h4";

/** True for a paragraph of ordinary text, also inside a list, a quote or the abstract. */
export function isTextParagraph(element: Element): boolean {
  return element.tagName === "P" && element.closest(NOT_NUMBERED) === null;
}

/** The visual lines of the ordinary text of an editor, with tops relative to the origin. */
export function measureLines(root: HTMLElement, originTop: number): Line[] {
  const result: Line[] = [];
  for (const block of Array.from(root.querySelectorAll("p"))) {
    if (!(block instanceof HTMLElement) || !isTextParagraph(block)) continue;
    const boxes: Box[] = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent || node.textContent.trim() === "") continue;
      range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) boxes.push({ top: rect.top, bottom: rect.bottom });
    }
    for (const atom of Array.from(block.querySelectorAll(ATOMS))) {
      const rect = atom.getBoundingClientRect();
      boxes.push({ top: rect.top, bottom: rect.bottom });
    }
    const found = clusterLines(boxes);
    if (found.length === 0) {
      // An empty paragraph takes one line
      const rect = block.getBoundingClientRect();
      found.push({ top: rect.top, height: Math.min(rect.height, 28) });
    }
    for (const line of found) result.push({ top: line.top - originTop, height: line.height });
  }
  return result;
}
