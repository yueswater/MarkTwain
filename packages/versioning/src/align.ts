/** A pair of positions, the one in the first sequence and the one in the second, that hold the same item. */
export type Match = readonly [number, number];

/** Myers gives the shortest set of changes, but it needs memory in proportion to the square of the changes, so it stops at this many. */
const MYERS_LIMIT = 2000;
/** How many times a stretch between two anchors is looked at again for anchors of its own. */
const MAX_DEPTH = 64;

/**
 * Lines up two sequences: the pairs of positions that hold the same item, both in increasing order, as many as can be found.
 * It is the longest common subsequence when the two differ in no more than 2000 places (Myers). When they differ in more, the items that occur once in
 * both sequences are taken as anchors, the longest run of them that keeps its order is kept, and what lies between two anchors is lined up again.
 * Then it may leave out a pair that a longest common subsequence has. That only means a change that is shown as a deletion and an addition.
 */
export function align(a: readonly string[], b: readonly string[]): Match[] {
  const out: Match[] = [];
  alignRange(a, 0, a.length, b, 0, b.length, out, 0);
  return out;
}

function alignRange(a: readonly string[], a0: number, a1: number, b: readonly string[], b0: number, b1: number, out: Match[], depth: number): void {
  while (a0 < a1 && b0 < b1 && a[a0] === b[b0]) {
    out.push([a0, b0]);
    a0 += 1;
    b0 += 1;
  }
  const tail: Match[] = [];
  while (a0 < a1 && b0 < b1 && a[a1 - 1] === b[b1 - 1]) {
    a1 -= 1;
    b1 -= 1;
    tail.push([a1, b1]);
  }
  if (a0 < a1 && b0 < b1) {
    const found = myers(a, a0, a1 - a0, b, b0, b1 - b0);
    if (found) out.push(...found);
    else if (depth < MAX_DEPTH) patience(a, a0, a1, b, b0, b1, out, depth);
  }
  for (let k = tail.length - 1; k >= 0; k -= 1) out.push(tail[k] as Match);
}

/** The shortest edit script by Myers, as the matches of its common parts. Null when it needs more than the limit of changes. */
function myers(a: readonly string[], a0: number, n: number, b: readonly string[], b0: number, m: number): Match[] | null {
  const max = Math.min(n + m, MYERS_LIMIT);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  // For every number of changes, the furthest reach on each diagonal, only the diagonals that it can have
  const trace: Int32Array[] = [];
  for (let d = 0; d <= max; d += 1) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number)) ? (v[offset + k + 1] as number) : (v[offset + k - 1] as number) + 1;
      let y = x - k;
      while (x < n && y < m && a[a0 + x] === b[b0 + y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        trace.push(v.slice(offset - d, offset + d + 1));
        return backtrack(trace, d, n, m, a0, b0);
      }
    }
    trace.push(v.slice(offset - d, offset + d + 1));
  }
  return null;
}

function backtrack(trace: Int32Array[], last: number, n: number, m: number, a0: number, b0: number): Match[] {
  const found: Match[] = [];
  let x = n;
  let y = m;
  for (let d = last; d > 0; d -= 1) {
    const previous = trace[d - 1] as Int32Array;
    const at = (k: number) => previous[k + (d - 1)] as number;
    const k = x - y;
    const fromAbove = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const previousK = fromAbove ? k + 1 : k - 1;
    const previousX = at(previousK);
    const previousY = previousX - previousK;
    const startX = fromAbove ? previousX : previousX + 1;
    const startY = startX - k;
    while (x > startX && y > startY) {
      x -= 1;
      y -= 1;
      found.push([a0 + x, b0 + y]);
    }
    x = previousX;
    y = previousY;
  }
  while (x > 0 && y > 0) {
    x -= 1;
    y -= 1;
    found.push([a0 + x, b0 + y]);
  }
  return found.reverse();
}

/** Anchors on the items that occur once in both stretches, keeps the longest run of them in order, and lines up what lies between. */
function patience(a: readonly string[], a0: number, a1: number, b: readonly string[], b0: number, b1: number, out: Match[], depth: number): void {
  const inB = new Map<string, number>();
  for (let j = b0; j < b1; j += 1) {
    const item = b[j] as string;
    inB.set(item, inB.has(item) ? -1 : j);
  }
  const counts = new Map<string, number>();
  for (let i = a0; i < a1; i += 1) counts.set(a[i] as string, (counts.get(a[i] as string) ?? 0) + 1);
  const anchors: Match[] = [];
  for (let i = a0; i < a1; i += 1) {
    const item = a[i] as string;
    const j = inB.get(item);
    if (counts.get(item) === 1 && j !== undefined && j >= 0) anchors.push([i, j]);
  }
  if (anchors.length === 0) return;
  let previousA = a0;
  let previousB = b0;
  for (const [i, j] of longestIncreasing(anchors)) {
    alignRange(a, previousA, i, b, previousB, j, out, depth + 1);
    out.push([i, j]);
    previousA = i + 1;
    previousB = j + 1;
  }
  alignRange(a, previousA, a1, b, previousB, b1, out, depth + 1);
}

/** The longest run of anchors whose second positions go up, with the first positions going up already. */
function longestIncreasing(anchors: Match[]): Match[] {
  const tails: number[] = [];
  const previous = new Array<number>(anchors.length).fill(-1);
  for (let index = 0; index < anchors.length; index += 1) {
    const value = (anchors[index] as Match)[1];
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (((anchors[tails[middle] as number] as Match)[1]) < value) low = middle + 1;
      else high = middle;
    }
    previous[index] = low > 0 ? (tails[low - 1] as number) : -1;
    tails[low] = index;
  }
  const run: Match[] = [];
  for (let index = tails.length > 0 ? (tails[tails.length - 1] as number) : -1; index >= 0; index = previous[index] as number) run.push(anchors[index] as Match);
  return run.reverse();
}
