/** A run of text in a comparison of two texts: what both have, what only the old one has, what only the new one has. */
export type CharRun = { type: "same" | "removed" | "added"; text: string };

/** Above this many characters in the stretch that differs, the whole stretch is shown as removed and added, since a table of that size is slow. */
const LIMIT = 3000;

/**
 * Compares two texts by character, to show what changed inside a block. It is for showing only, nothing is merged from it.
 * What the texts share at the start and at the end is cut off first, and the stretch in between is lined up by a table of common lengths.
 */
export function charDiff(before: string, after: string): CharRun[] {
  const a = Array.from(before);
  const b = Array.from(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const runs: CharRun[] = [];
  const push = (type: CharRun["type"], chars: string[]) => {
    if (chars.length === 0) return;
    const text = chars.join("");
    const last = runs[runs.length - 1];
    if (last?.type === type) last.text += text;
    else runs.push({ type, text });
  };
  push("same", a.slice(0, start));

  const middleA = a.slice(start, endA);
  const middleB = b.slice(start, endB);
  if (middleA.length === 0 || middleB.length === 0 || middleA.length > LIMIT || middleB.length > LIMIT) {
    push("removed", middleA);
    push("added", middleB);
  } else {
    // The length of the longest common part of the tails, for every pair of places
    const width = middleB.length + 1;
    const table = new Uint16Array((middleA.length + 1) * width);
    for (let i = middleA.length - 1; i >= 0; i -= 1) {
      for (let j = middleB.length - 1; j >= 0; j -= 1) {
        table[i * width + j] = middleA[i] === middleB[j] ? (table[(i + 1) * width + j + 1] as number) + 1 : Math.max(table[(i + 1) * width + j] as number, table[i * width + j + 1] as number);
      }
    }
    let i = 0;
    let j = 0;
    while (i < middleA.length && j < middleB.length) {
      if (middleA[i] === middleB[j]) {
        push("same", [middleA[i] as string]);
        i += 1;
        j += 1;
      } else if ((table[(i + 1) * width + j] as number) >= (table[i * width + j + 1] as number)) {
        push("removed", [middleA[i] as string]);
        i += 1;
      } else {
        push("added", [middleB[j] as string]);
        j += 1;
      }
    }
    push("removed", middleA.slice(i));
    push("added", middleB.slice(j));
  }
  push("same", a.slice(endA));
  return runs;
}
