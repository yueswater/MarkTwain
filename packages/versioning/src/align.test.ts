import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { align } from "./align";

/** The length of a longest common subsequence by the plain table, the answer to compare with. */
function lcsLength(a: string[], b: string[]): number {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i]![j] = a[i - 1] === b[j - 1] ? table[i - 1]![j - 1]! + 1 : Math.max(table[i - 1]![j]!, table[i]![j - 1]!);
    }
  }
  return table[a.length]![b.length]!;
}

const sequence = fc.array(fc.constantFrom("a", "b", "c", "d", "e"), { maxLength: 30 });

describe("align", () => {
  it("matches equal sequences in full and finds nothing between sequences with nothing in common", () => {
    expect(align(["a", "b", "c"], ["a", "b", "c"])).toEqual([[0, 0], [1, 1], [2, 2]]);
    expect(align(["a", "b"], ["c", "d"])).toEqual([]);
    expect(align([], ["a"])).toEqual([]);
    expect(align(["a"], [])).toEqual([]);
  });

  it("finds the common parts around an insertion, a deletion and a change", () => {
    expect(align(["a", "b", "c"], ["a", "x", "b", "c"])).toEqual([[0, 0], [1, 2], [2, 3]]);
    expect(align(["a", "b", "c"], ["a", "c"])).toEqual([[0, 0], [2, 1]]);
    expect(align(["a", "b", "c"], ["a", "x", "c"])).toEqual([[0, 0], [2, 2]]);
  });

  it("gives matches of equal items whose positions only go up, and as many as a longest common subsequence", () => {
    fc.assert(
      fc.property(sequence, sequence, (a, b) => {
        const matches = align(a, b);
        for (const [i, j] of matches) expect(a[i]).toBe(b[j]);
        for (let k = 1; k < matches.length; k += 1) {
          expect(matches[k]![0]).toBeGreaterThan(matches[k - 1]![0]);
          expect(matches[k]![1]).toBeGreaterThan(matches[k - 1]![1]);
        }
        expect(matches.length).toBe(lcsLength(a, b));
      }),
      { numRuns: 300 },
    );
  });

  it("keeps the order and the equality of the matches of two long sequences that differ in many places", () => {
    const base = Array.from({ length: 6000 }, (_, i) => `b${i}`);
    // A third of the blocks are replaced and a few are moved, far beyond what Myers is given
    const other = base.map((item, i) => (i % 3 === 0 ? `n${i}` : item));
    other.splice(10, 0, other.splice(5000, 1)[0] as string);
    const matches = align(base, other);
    for (const [i, j] of matches) expect(base[i]).toBe(other[j]);
    for (let k = 1; k < matches.length; k += 1) {
      expect(matches[k]![0]).toBeGreaterThan(matches[k - 1]![0]);
      expect(matches[k]![1]).toBeGreaterThan(matches[k - 1]![1]);
    }
    // The 4000 blocks that stayed are found, give or take the one that moved
    expect(matches.length).toBeGreaterThanOrEqual(3990);
  });
});
