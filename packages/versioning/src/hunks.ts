import { align } from "./align";
import type { Hash } from "./types";

/** A change that one side made: the blocks of the base from `start` up to `end` are replaced by `blocks`. An insertion has start equal to end, a deletion has no blocks. */
export type Hunk = { start: number; end: number; blocks: Hash[] };

/** The changes that turn the base into the other sequence, each one is a stretch between two blocks that stayed. */
export function hunksBetween(base: readonly Hash[], other: readonly Hash[]): Hunk[] {
  const hunks: Hunk[] = [];
  let baseAt = 0;
  let otherAt = 0;
  const flush = (baseTo: number, otherTo: number) => {
    if (baseTo > baseAt || otherTo > otherAt) hunks.push({ start: baseAt, end: baseTo, blocks: other.slice(otherAt, otherTo) as Hash[] });
  };
  for (const [i, j] of align(base, other)) {
    flush(i, j);
    baseAt = i + 1;
    otherAt = j + 1;
  }
  flush(base.length, other.length);
  return hunks;
}

/** The stretch of the base from `start` up to `end` with the hunks that lie in it applied. Hunk positions are those of the whole base. */
export function applyHunks(base: readonly Hash[], start: number, end: number, hunks: readonly Hunk[]): Hash[] {
  const out: Hash[] = [];
  let at = start;
  for (const hunk of hunks) {
    out.push(...base.slice(at, hunk.start));
    out.push(...hunk.blocks);
    at = hunk.end;
  }
  out.push(...base.slice(at, end));
  return out;
}
