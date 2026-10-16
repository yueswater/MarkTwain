import { diffBlocks, type BlockChange } from "./diff";
import type { DocumentEntry, Hash, SnapshotContent } from "./types";

type Field = "kind" | "title" | "position";

/** One thing that a version can take or leave, like a hunk that is staged in git. */
export type ChangeItem =
  /** A document that was added or taken away as a whole */
  | { id: string; type: "document"; docId: string; status: "added" | "removed" }
  /** The kind, the title or the position of a document that differ */
  | { id: string; type: "fields"; docId: string; fields: { field: Field; from: string | number; to: string | number }[] }
  /** One run of blocks that were added, taken away or changed in a document, the blocks that stayed are not in it */
  | { id: string; type: "hunk"; docId: string; changes: Exclude<BlockChange, { type: "same" }>[] }
  | { id: string; type: "file"; path: string; status: "added" | "removed" | "changed" };

type Group = { type: "same"; hashes: Hash[] } | { type: "change"; before: Hash[]; after: Hash[]; changes: Exclude<BlockChange, { type: "same" }>[] };

const FIELDS: Field[] = ["kind", "title", "position"];

/** The comparison of two block sequences as runs: what stayed, and what changed together, in order. The same runs are used to list and to apply. */
function groups(before: readonly Hash[], after: readonly Hash[]): Group[] {
  const out: Group[] = [];
  for (const change of diffBlocks(before, after)) {
    const last = out[out.length - 1];
    if (change.type === "same") {
      if (last?.type === "same") last.hashes.push(change.hash);
      else out.push({ type: "same", hashes: [change.hash] });
      continue;
    }
    const group: Extract<Group, { type: "change" }> = last?.type === "change" ? last : { type: "change", before: [], after: [], changes: [] };
    if (group !== last) out.push(group);
    group.changes.push(change);
    if (change.type === "added") group.after.push(change.hash);
    else if (change.type === "removed") group.before.push(change.hash);
    else {
      group.before.push(change.from);
      group.after.push(change.to);
    }
  }
  return out;
}

/** What differs between the latest version and what is being worked on, as items that can be chosen one by one. */
export function listChanges(head: SnapshotContent, working: SnapshotContent): ChangeItem[] {
  const items: ChangeItem[] = [];
  const ids = new Set([...Object.keys(head.documents), ...Object.keys(working.documents)]);
  for (const docId of [...ids].sort()) {
    const h = head.documents[docId];
    const w = working.documents[docId];
    if (!h && w) items.push({ id: `doc:${docId}`, type: "document", docId, status: "added" });
    else if (h && !w) items.push({ id: `doc:${docId}`, type: "document", docId, status: "removed" });
    else if (h && w) {
      const fields = FIELDS.flatMap((field) => (h[field] !== w[field] ? [{ field, from: h[field], to: w[field] }] : []));
      if (fields.length > 0) items.push({ id: `fields:${docId}`, type: "fields", docId, fields });
      let count = 0;
      for (const group of groups(h.blocks, w.blocks)) {
        if (group.type === "change") items.push({ id: `hunk:${docId}:${count++}`, type: "hunk", docId, changes: group.changes });
      }
    }
  }
  const paths = new Set([...Object.keys(head.files), ...Object.keys(working.files)]);
  for (const path of [...paths].sort()) {
    const a = head.files[path];
    const b = working.files[path];
    if (a === b) continue;
    items.push({ id: `file:${path}`, type: "file", path, status: a === undefined ? "added" : b === undefined ? "removed" : "changed" });
  }
  return items;
}

/**
 * The content of a version that takes the chosen changes and leaves the others where they are in the latest version, as a commit does with what was staged.
 * Choosing everything gives the working content and choosing nothing gives the latest version.
 */
export function applySelection(head: SnapshotContent, working: SnapshotContent, selected: ReadonlySet<string>): SnapshotContent {
  const documents: Record<string, DocumentEntry> = {};
  const ids = new Set([...Object.keys(head.documents), ...Object.keys(working.documents)]);
  for (const docId of ids) {
    const h = head.documents[docId];
    const w = working.documents[docId];
    if (h && w) {
      const takeFields = selected.has(`fields:${docId}`);
      const blocks: Hash[] = [];
      let count = 0;
      for (const group of groups(h.blocks, w.blocks)) {
        if (group.type === "same") blocks.push(...group.hashes);
        else blocks.push(...(selected.has(`hunk:${docId}:${count++}`) ? group.after : group.before));
      }
      const source = takeFields ? w : h;
      documents[docId] = { kind: source.kind, title: source.title, position: source.position, blocks };
    } else if (w) {
      if (selected.has(`doc:${docId}`)) documents[docId] = { ...w, blocks: [...w.blocks] };
    } else if (h && !selected.has(`doc:${docId}`)) {
      documents[docId] = { ...h, blocks: [...h.blocks] };
    }
  }
  const files: Record<string, Hash> = {};
  for (const path of new Set([...Object.keys(head.files), ...Object.keys(working.files)])) {
    const a = head.files[path];
    const b = working.files[path];
    const value = a !== b && selected.has(`file:${path}`) ? b : a;
    if (value !== undefined) files[path] = value;
  }
  return { documents, files };
}
