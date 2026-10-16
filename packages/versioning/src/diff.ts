import { hunksBetween } from "./hunks";
import type { DocumentEntry, Hash, SnapshotContent } from "./types";

/** One entry of the comparison of two block sequences. A modified block is one that was replaced by another at the same place. */
export type BlockChange =
  | { type: "same"; hash: Hash }
  | { type: "added"; hash: Hash }
  | { type: "removed"; hash: Hash }
  | { type: "modified"; from: Hash; to: Hash };

/** Compares two block sequences, in the order of the new one with what was removed placed where it was. */
export function diffBlocks(from: readonly Hash[], to: readonly Hash[]): BlockChange[] {
  const changes: BlockChange[] = [];
  let at = 0;
  for (const hunk of hunksBetween(from, to)) {
    for (; at < hunk.start; at += 1) changes.push({ type: "same", hash: from[at] as Hash });
    const removed = from.slice(hunk.start, hunk.end);
    const paired = Math.min(removed.length, hunk.blocks.length);
    for (let k = 0; k < paired; k += 1) changes.push({ type: "modified", from: removed[k] as Hash, to: hunk.blocks[k] as Hash });
    for (const hash of removed.slice(paired)) changes.push({ type: "removed", hash });
    for (const hash of hunk.blocks.slice(paired)) changes.push({ type: "added", hash });
    at = hunk.end;
  }
  for (; at < from.length; at += 1) changes.push({ type: "same", hash: from[at] as Hash });
  return changes;
}

export type DocumentDiff = {
  docId: string;
  status: "added" | "removed" | "changed" | "same";
  /** The kind, the title and the position that differ, with the old value and the new one */
  fields: { field: "kind" | "title" | "position"; from: string | number | null; to: string | number | null }[];
  changes: BlockChange[];
};

export type FileDiff = { path: string; status: "added" | "removed" | "changed" };

export type ContentDiff = { documents: DocumentDiff[]; files: FileDiff[] };

/** What differs between two snapshots, by document and by block, and by file. Documents that are the same are left out. */
export function diffContent(from: SnapshotContent, to: SnapshotContent): ContentDiff {
  const documents: DocumentDiff[] = [];
  const ids = new Set([...Object.keys(from.documents), ...Object.keys(to.documents)]);
  for (const docId of [...ids].sort()) {
    const a: DocumentEntry | undefined = from.documents[docId];
    const b: DocumentEntry | undefined = to.documents[docId];
    const fields = (["kind", "title", "position"] as const).flatMap((field) => (a?.[field] !== b?.[field] && a && b ? [{ field, from: a[field], to: b[field] }] : []));
    const changes = diffBlocks(a?.blocks ?? [], b?.blocks ?? []);
    const status = !a ? "added" : !b ? "removed" : fields.length > 0 || changes.some((change) => change.type !== "same") ? "changed" : "same";
    if (status !== "same") documents.push({ docId, status, fields, changes });
  }
  const files: FileDiff[] = [];
  const paths = new Set([...Object.keys(from.files), ...Object.keys(to.files)]);
  for (const path of [...paths].sort()) {
    const a = from.files[path];
    const b = to.files[path];
    if (a === undefined) files.push({ path, status: "added" });
    else if (b === undefined) files.push({ path, status: "removed" });
    else if (a !== b) files.push({ path, status: "changed" });
  }
  return { documents, files };
}
