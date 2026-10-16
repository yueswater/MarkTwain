import type { Snapshot } from "./types";

export type SnapshotGraph = ReadonlyMap<string, Snapshot>;

function parentsOf(snapshot: Snapshot): string[] {
  return [snapshot.parentId, snapshot.parent2Id].filter((id): id is string => id !== null);
}

/** A snapshot and all that came before it, itself first, in the order that they are reached from it. */
export function ancestors(graph: SnapshotGraph, id: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    const snapshot = graph.get(current);
    if (!snapshot) throw new Error(`unknown snapshot ${current}`);
    seen.add(current);
    order.push(current);
    queue.push(...parentsOf(snapshot));
  }
  return order;
}

/**
 * The newest snapshot that both lines have, the base of a merge. A snapshot that is the ancestor of another common one is not the nearest, so it is left out.
 * When a merge was made in both directions there can be two nearest ones, then the one that was made later is taken.
 * Null when the lines share no snapshot.
 */
export function commonAncestor(graph: SnapshotGraph, a: string, b: string): string | null {
  const fromB = new Set(ancestors(graph, b));
  const common = ancestors(graph, a).filter((id) => fromB.has(id));
  if (common.length === 0) return null;
  const hidden = new Set<string>();
  for (const id of common) {
    for (const older of ancestors(graph, id).slice(1)) hidden.add(older);
  }
  const nearest = common.filter((id) => !hidden.has(id));
  nearest.sort((x, y) => (graph.get(y)?.createdAt ?? 0) - (graph.get(x)?.createdAt ?? 0) || (x < y ? -1 : 1));
  return nearest[0] ?? null;
}

/** Whether `older` is `newer` itself or one of its ancestors, so that a merge of the two is only a move forward. */
export function isAncestor(graph: SnapshotGraph, older: string, newer: string): boolean {
  return ancestors(graph, newer).includes(older);
}
