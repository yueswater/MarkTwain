import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { mergeBlocks, type Part } from "./merge-blocks";
import { threeWayMerge } from "./merge";
import type { SnapshotContent } from "./types";

type Edit = { start: number; end: number; blocks: string[] };

/** The blocks of one side: the base with its edits put in, worked out by hand from places that are far enough apart not to touch. */
function applyEdits(base: string[], edits: Edit[]): string[] {
  const out: string[] = [];
  let at = 0;
  for (const edit of edits) {
    out.push(...base.slice(at, edit.start), ...edit.blocks);
    at = edit.end;
  }
  return [...out, ...base.slice(at)];
}

const flat = (parts: Part[]): string[] => parts.flatMap((part) => (part.kind === "stable" ? part.blocks : []));
const conflicts = (parts: Part[]) => parts.filter((part) => part.kind === "conflict");

/**
 * A base of unique blocks and the edits of two sides, each edit with its own new blocks. Between any two edits, of the same side or not,
 * there is a block that no one touched, so no two of them touch and the merge has nothing to decide.
 */
const scenario = fc
  .record({
    size: fc.integer({ min: 0, max: 24 }),
    specs: fc.array(fc.record({ gap: fc.integer({ min: 1, max: 3 }), length: fc.integer({ min: 0, max: 3 }), added: fc.integer({ min: 0, max: 3 }), ours: fc.boolean() }), { maxLength: 6 }),
  })
  .map(({ size, specs }) => {
    const base = Array.from({ length: size }, (_, i) => `b${i}`);
    const ours: Edit[] = [];
    const theirs: Edit[] = [];
    let cursor = 0;
    let fresh = 0;
    for (const spec of specs) {
      const start = cursor + spec.gap;
      const end = start + spec.length;
      if (end > size || (spec.length === 0 && spec.added === 0)) continue;
      const blocks = Array.from({ length: spec.added }, () => `${spec.ours ? "o" : "t"}${fresh++}`);
      (spec.ours ? ours : theirs).push({ start, end, blocks });
      cursor = end;
    }
    return { base, ours, theirs };
  });

describe("merging blocks, by chance", () => {
  it("has no conflict and loses no change when the two sides changed places apart from each other", () => {
    fc.assert(
      fc.property(scenario, ({ base, ours, theirs }) => {
        const parts = mergeBlocks(base, applyEdits(base, ours), applyEdits(base, theirs));
        expect(conflicts(parts)).toEqual([]);
        expect(flat(parts)).toEqual(applyEdits(base, [...ours, ...theirs].sort((a, b) => a.start - b.start || a.end - b.end)));
      }),
      { numRuns: 500 },
    );
  });

  it("gives the same blocks whichever side is the main line, when there is no conflict", () => {
    fc.assert(
      fc.property(scenario, ({ base, ours, theirs }) => {
        const a = applyEdits(base, ours);
        const b = applyEdits(base, theirs);
        expect(flat(mergeBlocks(base, a, b))).toEqual(flat(mergeBlocks(base, b, a)));
      }),
      { numRuns: 300 },
    );
  });

  it("merges a line with itself into itself, and takes a change as it is when the other side kept the base", () => {
    fc.assert(
      fc.property(scenario, ({ base, ours }) => {
        const a = applyEdits(base, ours);
        expect(flat(mergeBlocks(a, a, a))).toEqual(a);
        expect(flat(mergeBlocks(base, a, base))).toEqual(a);
        expect(flat(mergeBlocks(base, base, a))).toEqual(a);
        expect(flat(mergeBlocks(base, a, a))).toEqual(a);
      }),
      { numRuns: 300 },
    );
  });

  it("is a conflict, with the two versions of the stretch, when both sides replaced the same blocks in different ways", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 0, max: 11 }), fc.integer({ min: 1, max: 3 }), (size, from, length) => {
        const start = Math.min(from, size - 1);
        const end = Math.min(start + length, size);
        const base = Array.from({ length: size }, (_, i) => `b${i}`);
        const parts = mergeBlocks(base, applyEdits(base, [{ start, end, blocks: ["o"] }]), applyEdits(base, [{ start, end, blocks: ["t"] }]));
        expect(conflicts(parts)).toEqual([{ kind: "conflict", base: base.slice(start, end), ours: ["o"], theirs: ["t"] }]);
        // Everything outside the stretch is as it was
        expect([...base.slice(0, start), ...base.slice(end)]).toEqual(flat(parts));
      }),
      { numRuns: 200 },
    );
  });

  it("keeps the order of the blocks that no one changed", () => {
    fc.assert(
      fc.property(scenario, scenario, ({ base, ours }, { theirs: other }) => {
        // The two sides do not come from the same scenario, so they may well conflict, whatever stayed must stay in order
        const a = applyEdits(base, ours);
        const b = applyEdits(base, other.filter((edit) => edit.end <= base.length));
        const merged = flat(mergeBlocks(base, a, b));
        const kept = base.filter((block) => a.includes(block) && b.includes(block));
        let at = 0;
        for (const block of merged) if (block === kept[at]) at += 1;
        expect(at).toBe(kept.length);
      }),
      { numRuns: 200 },
    );
  });
});

describe("merging content, by chance", () => {
  it("is the same content when merged with itself, whatever the documents and files", () => {
    const entry = fc.record({ kind: fc.constantFrom("chapter", "abstract"), title: fc.string({ maxLength: 6 }), position: fc.integer({ min: 0, max: 5 }), blocks: fc.array(fc.constantFrom("a", "b", "c", "d"), { maxLength: 8 }) });
    const content = fc.record({ documents: fc.dictionary(fc.constantFrom("d1", "d2", "d3"), entry), files: fc.dictionary(fc.constantFrom("config.yml", "refs.bib", "a.png"), fc.constantFrom("h1", "h2", "h3")) });
    fc.assert(
      fc.property(content, (value: SnapshotContent) => {
        expect(threeWayMerge(value, value, value).content).toEqual(value);
        expect(threeWayMerge(null, value, value).content).toEqual(value);
      }),
      { numRuns: 200 },
    );
  });
});

describe("merging many blocks", () => {
  it("merges the changes of two sides to a tenth of ten thousand blocks each, apart from each other, in a moment", () => {
    const base = Array.from({ length: 10_000 }, (_, i) => `b${i}`);
    // Ours replaces every tenth block from 0, theirs every tenth block from 5, so no two touch
    const ours = base.map((block, i) => (i % 10 === 0 ? `o${i}` : block));
    const theirs = base.map((block, i) => (i % 10 === 5 ? `t${i}` : block));
    const started = Date.now();
    const parts = mergeBlocks(base, ours, theirs);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(conflicts(parts)).toEqual([]);
    expect(flat(parts)).toEqual(base.map((block, i) => (i % 10 === 0 ? `o${i}` : i % 10 === 5 ? `t${i}` : block)));
  });
});
