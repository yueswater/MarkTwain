import { inflateSync } from "node:zlib";

const COUNT = /\/Count\s+(\d+)/g;

function largestCount(text: string): number {
  let count = 0;
  for (const match of text.matchAll(COUNT)) count = Math.max(count, Number(match[1]));
  return count;
}

/** The content of the object streams of a PDF, where newer writers keep the page tree. A stream that cannot be inflated is skipped. */
function objectStreams(text: string, raw: Buffer): string[] {
  const out: string[] = [];
  for (const head of text.matchAll(/<<[^>]*\/Type\s*\/ObjStm[^>]*>>\s*stream\r?\n/g)) {
    const start = (head.index ?? 0) + head[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) continue;
    try {
      out.push(inflateSync(raw.subarray(start, end)).toString("latin1"));
    } catch {
      // A damaged stream only means that its page count is not known
    }
  }
  return out;
}

/**
 * The number of pages from the page tree of a PDF, the root has the largest count.
 * Typst writes the tree as plain objects, XeLaTeX keeps it in a compressed object stream.
 */
export function pageCountOf(pdf: Uint8Array): number {
  const raw = Buffer.from(pdf);
  const text = raw.toString("latin1");
  return Math.max(largestCount(text), ...objectStreams(text, raw).map(largestCount));
}
