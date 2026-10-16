import { resolveMerge, threeWayMerge, type SnapshotContent } from "@marktwain/versioning";

export type MergeRun = {
  ok: boolean;
  blocks: number;
  /** The share of the blocks that each side changed */
  changePercent: number;
  conflicting: boolean;
  mergeMs: number;
  /** What the process holds after the merge and how much the heap grew in it, in megabytes */
  rssMb: number;
  heapGrowthMb: number;
  conflicts: number;
  errors: string[];
};

const content = (blocks: string[]): SnapshotContent => ({ documents: { thesis: { kind: "chapter", title: "", position: 1, blocks } }, files: { "config.yml": "cfg" } });

/**
 * Two branches that each change a share of the blocks of a document of the given size, merged into one, and checked.
 * Without conflicts the two sides change blocks next to each other but never the same one, so the answer is known: every change of both is in.
 * With conflicts both sides change the same blocks in different ways, so there is one conflict for each run of changed blocks, and choosing the main line gives back the main line.
 */
export function runMergeScenario(blocks: number, changePercent: number, conflicting = false): MergeRun {
  const every = Math.max(2, Math.round(100 / changePercent));
  const base = Array.from({ length: blocks }, (_, i) => `b${i}`);
  const ours = base.map((hash, i) => (i % every === 0 ? `o${i}` : hash));
  const theirs = base.map((hash, i) => (i % every === (conflicting ? 0 : 1) ? `t${i}` : hash));

  const errors: string[] = [];
  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  const result = threeWayMerge(content(base), content(ours), content(theirs));
  const mergeMs = performance.now() - started;
  const memory = process.memoryUsage();

  if (conflicting) {
    const expected = Math.ceil(blocks / every);
    if (result.draft.conflicts.length !== expected) errors.push(`expected ${expected} conflicts, got ${result.draft.conflicts.length}`);
    const choices = Object.fromEntries(result.draft.conflicts.map((conflict) => [conflict.id, "ours" as const]));
    const resolved = resolveMerge(result.draft, choices).documents.thesis?.blocks ?? [];
    if (resolved.length !== blocks || resolved.some((hash, i) => hash !== ours[i])) errors.push("choosing the main line everywhere did not give the main line");
  } else {
    if (result.draft.conflicts.length > 0) errors.push(`${result.draft.conflicts.length} conflicts where there should be none`);
    const merged = result.content?.documents.thesis?.blocks ?? [];
    const expected = base.map((hash, i) => (i % every === 0 ? `o${i}` : i % every === 1 ? `t${i}` : hash));
    if (merged.length !== blocks || merged.some((hash, i) => hash !== expected[i])) errors.push("the merged blocks are not the changes of both sides");
  }
  return {
    ok: errors.length === 0,
    blocks,
    changePercent,
    conflicting,
    mergeMs: Math.round(mergeMs * 10) / 10,
    rssMb: Math.round(memory.rss / 1e6),
    heapGrowthMb: Math.round(((memory.heapUsed - heapBefore) / 1e6) * 10) / 10,
    conflicts: result.draft.conflicts.length,
    errors,
  };
}
