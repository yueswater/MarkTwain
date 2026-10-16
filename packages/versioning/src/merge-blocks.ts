import { applyHunks, hunksBetween, type Hunk } from "./hunks";
import type { Hash } from "./types";

/** A stretch of a merged document: blocks that no one disputes, or the blocks of a stretch that the two sides changed in different ways. */
export type Part =
  | { kind: "stable"; blocks: Hash[] }
  | { kind: "conflict"; base: Hash[]; ours: Hash[]; theirs: Hash[] };

type Side = "ours" | "theirs";
type Tagged = Hunk & { side: Side };

/**
 * Two changes touch when they cut the same blocks of the base, or when both put something at the same place.
 * A change at a place between two blocks only touches a change that cuts across that place, so an insertion next to a change is kept apart from it.
 */
function touches(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  const aEmpty = a.start === a.end;
  const bEmpty = b.start === b.end;
  if (aEmpty && bEmpty) return a.start === b.start;
  if (aEmpty) return b.start < a.start && a.start < b.end;
  if (bEmpty) return a.start < b.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
}

const same = (a: readonly Hash[], b: readonly Hash[]) => a.length === b.length && a.every((hash, index) => hash === b[index]);

/**
 * Merges the blocks of a document, in the way of diff3 but with the blocks lined up first.
 * What only one side changed is taken. What both sides changed the same way is taken once. What both sides changed in different ways, in the same place, is a conflict.
 * A block that moved is a deletion where it was and an addition where it went, there is no move.
 */
export function mergeBlocks(base: readonly Hash[], ours: readonly Hash[], theirs: readonly Hash[]): Part[] {
  const tagged: Tagged[] = [
    ...hunksBetween(base, ours).map((hunk) => ({ ...hunk, side: "ours" as const })),
    ...hunksBetween(base, theirs).map((hunk) => ({ ...hunk, side: "theirs" as const })),
  ];
  // By place, and a change at a place goes before one that starts there
  tagged.sort((a, b) => a.start - b.start || a.end - b.end);

  const parts: Part[] = [];
  const stable: Hash[] = [];
  const flush = () => {
    if (stable.length > 0) parts.push({ kind: "stable", blocks: stable.splice(0) });
  };
  let at = 0;
  let index = 0;
  while (index < tagged.length) {
    const first = tagged[index] as Tagged;
    const cluster: Tagged[] = [first];
    let start = first.start;
    let end = first.end;
    index += 1;
    // Changes that touch the stretch are part of it, and then the stretch is as long as all of them
    while (index < tagged.length && touches({ start, end }, tagged[index] as Tagged)) {
      const next = tagged[index] as Tagged;
      cluster.push(next);
      start = Math.min(start, next.start);
      end = Math.max(end, next.end);
      index += 1;
    }
    stable.push(...base.slice(at, start));
    const mine = cluster.filter((hunk) => hunk.side === "ours");
    const theirsHere = cluster.filter((hunk) => hunk.side === "theirs");
    if (theirsHere.length === 0 || mine.length === 0) {
      stable.push(...applyHunks(base, start, end, cluster));
    } else {
      const oursBlocks = applyHunks(base, start, end, mine);
      const theirsBlocks = applyHunks(base, start, end, theirsHere);
      if (same(oursBlocks, theirsBlocks)) stable.push(...oursBlocks);
      else {
        flush();
        parts.push({ kind: "conflict", base: base.slice(start, end) as Hash[], ours: oursBlocks, theirs: theirsBlocks });
      }
    }
    at = end;
  }
  stable.push(...base.slice(at));
  flush();
  return parts;
}
