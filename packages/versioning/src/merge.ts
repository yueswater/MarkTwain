import { mergeBlocks } from "./merge-blocks";
import type { DocumentEntry, Hash, SnapshotContent } from "./types";

type Field = "kind" | "title" | "position";

/** A stretch of a document in a merge draft, conflicts have an id to be resolved by. */
export type DraftPart =
  | { kind: "stable"; blocks: Hash[] }
  | { kind: "conflict"; id: string; base: Hash[]; ours: Hash[]; theirs: Hash[] };

export type DraftDocument = { kind: string; title: string; position: number; parts: DraftPart[] };

export type MergeConflict =
  /** Both sides changed the same blocks of a document in different ways */
  | { id: string; type: "blocks"; docId: string; base: Hash[]; ours: Hash[]; theirs: Hash[] }
  /** Both sides changed the kind, the title or the position of a document in different ways */
  | { id: string; type: "field"; docId: string; field: Field; base: string | number | null; ours: string | number; theirs: string | number }
  /** Both sides changed a file in different ways, a side that deleted it has null */
  | { id: string; type: "file"; path: string; base: Hash | null; ours: Hash | null; theirs: Hash | null }
  /** One side deleted a document that the other changed */
  | { id: string; type: "document"; docId: string; deletedBy: "ours" | "theirs" };

/** A merge as far as it can go without a person: what is settled, and what is left to choose. Nothing is written from it until every conflict has a choice. */
export type MergeDraft = {
  documents: Record<string, DraftDocument>;
  /** The files that are settled, a file that is in conflict is not here */
  files: Record<string, Hash>;
  conflicts: MergeConflict[];
};

export type MergeResult = {
  draft: MergeDraft;
  /** The merged content, only when there is no conflict */
  content: SnapshotContent | null;
};

const EMPTY: SnapshotContent = { documents: {}, files: {} };

/** Settles one value that three versions hold: the side that changed it wins, the same change on both sides counts once, different changes are a conflict. */
function settle<T>(base: T, ours: T, theirs: T): { value: T } | "conflict" {
  if (ours === theirs) return { value: ours };
  if (ours === base) return { value: theirs };
  if (theirs === base) return { value: ours };
  return "conflict";
}

function sameDocument(a: DocumentEntry, b: DocumentEntry): boolean {
  return a.kind === b.kind && a.title === b.title && a.position === b.position && a.blocks.length === b.blocks.length && a.blocks.every((hash, i) => hash === b.blocks[i]);
}

const wholeDocument = (entry: DocumentEntry): DraftDocument => ({ kind: entry.kind, title: entry.title, position: entry.position, parts: entry.blocks.length > 0 ? [{ kind: "stable", blocks: [...entry.blocks] }] : [] });

/**
 * Merges the content of two lines of versions with the content of the snapshot where they parted, the base.
 * The documents are merged by their blocks (see mergeBlocks), what a document is called, its kind and its position as single values,
 * and the files as whole files: one side changed it and that is taken, or both changed it in different ways and that is a conflict.
 * It is a pure function. `ours` is the line that the merge goes into, `theirs` is the one that comes in.
 */
export function threeWayMerge(base: SnapshotContent | null, ours: SnapshotContent, theirs: SnapshotContent): MergeResult {
  const origin = base ?? EMPTY;
  const conflicts: MergeConflict[] = [];
  const documents: Record<string, DraftDocument> = {};
  const files: Record<string, Hash> = {};

  const ids = new Set([...Object.keys(origin.documents), ...Object.keys(ours.documents), ...Object.keys(theirs.documents)]);
  for (const docId of [...ids].sort()) {
    const b = origin.documents[docId];
    const o = ours.documents[docId];
    const t = theirs.documents[docId];
    if (o && t) {
      const draft: DraftDocument = { kind: o.kind, title: o.title, position: o.position, parts: [] };
      for (const field of ["kind", "title", "position"] as const) {
        const settled = settle<string | number | undefined>(b?.[field], o[field], t[field]);
        if (settled === "conflict") {
          conflicts.push({ id: `${docId}:${field}`, type: "field", docId, field, base: b?.[field] ?? null, ours: o[field], theirs: t[field] });
        } else {
          (draft as Record<Field, string | number>)[field] = settled.value as string | number;
        }
      }
      let count = 0;
      draft.parts = mergeBlocks(b?.blocks ?? [], o.blocks, t.blocks).map((part): DraftPart => {
        if (part.kind === "stable") return part;
        const id = `${docId}#${count}`;
        count += 1;
        conflicts.push({ id, type: "blocks", docId, base: part.base, ours: part.ours, theirs: part.theirs });
        return { ...part, id };
      });
      documents[docId] = draft;
    } else if (o || t) {
      const present = (o ?? t) as DocumentEntry;
      const presentSide = o ? "ours" : "theirs";
      if (!b) documents[docId] = wholeDocument(present);
      else if (sameDocument(b, present)) continue; // the other side deleted it and this side did not touch it
      else {
        documents[docId] = wholeDocument(present);
        conflicts.push({ id: `${docId}:document`, type: "document", docId, deletedBy: presentSide === "ours" ? "theirs" : "ours" });
      }
    }
  }

  const paths = new Set([...Object.keys(origin.files), ...Object.keys(ours.files), ...Object.keys(theirs.files)]);
  for (const path of [...paths].sort()) {
    const b = origin.files[path] ?? null;
    const o = ours.files[path] ?? null;
    const t = theirs.files[path] ?? null;
    const settled = settle(b, o, t);
    if (settled === "conflict") conflicts.push({ id: `file:${path}`, type: "file", path, base: b, ours: o, theirs: t });
    else if (settled.value !== null) files[path] = settled.value;
  }

  const draft: MergeDraft = { documents, files, conflicts };
  return { draft, content: conflicts.length === 0 ? contentOf(draft, {}) : null };
}

/** How a person settles a conflict. Blocks take the main line, the change that comes in, the base, both one after the other, or blocks of their own. */
export type Choice = "ours" | "theirs" | "base" | "both" | "keep" | "delete" | { blocks: Hash[] };
export type Resolutions = Record<string, Choice>;

export class UnresolvedConflictError extends Error {
  constructor(readonly ids: string[]) {
    super(`conflicts without a choice: ${ids.join(", ")}`);
  }
}

/** The content of a draft once every conflict has a choice. Throws when one has none or when a choice does not fit its conflict. */
export function resolveMerge(draft: MergeDraft, resolutions: Resolutions): SnapshotContent {
  const missing = draft.conflicts.filter((conflict) => resolutions[conflict.id] === undefined).map((conflict) => conflict.id);
  if (missing.length > 0) throw new UnresolvedConflictError(missing);
  return contentOf(draft, resolutions);
}

function contentOf(draft: MergeDraft, resolutions: Resolutions): SnapshotContent {
  const byId = new Map(draft.conflicts.map((conflict) => [conflict.id, conflict]));
  const documents: Record<string, DocumentEntry> = {};
  const files: Record<string, Hash> = { ...draft.files };

  for (const [docId, document] of Object.entries(draft.documents)) {
    const entry: DocumentEntry = { kind: document.kind, title: document.title, position: document.position, blocks: [] };
    for (const part of document.parts) {
      if (part.kind === "stable") entry.blocks.push(...part.blocks);
      else entry.blocks.push(...chooseBlocks(part, resolutions[part.id]));
    }
    for (const field of ["kind", "title", "position"] as const) {
      const conflict = byId.get(`${docId}:${field}`);
      if (conflict?.type !== "field") continue;
      const choice = resolutions[conflict.id];
      if (choice !== "ours" && choice !== "theirs") throw new Error(`a choice for ${conflict.id} is ours or theirs`);
      (entry as Record<Field, string | number>)[field] = choice === "ours" ? conflict.ours : conflict.theirs;
    }
    const gone = byId.get(`${docId}:document`);
    if (gone) {
      const choice = resolutions[gone.id];
      if (choice !== "keep" && choice !== "delete") throw new Error(`a choice for ${gone.id} is keep or delete`);
      if (choice === "delete") continue;
    }
    documents[docId] = entry;
  }

  for (const conflict of draft.conflicts) {
    if (conflict.type !== "file") continue;
    const choice = resolutions[conflict.id];
    if (choice !== "ours" && choice !== "theirs" && choice !== "base") throw new Error(`a choice for ${conflict.id} is ours, theirs or base`);
    const hash = choice === "ours" ? conflict.ours : choice === "theirs" ? conflict.theirs : conflict.base;
    if (hash !== null) files[conflict.path] = hash;
  }
  return { documents, files };
}

function chooseBlocks(part: Extract<DraftPart, { kind: "conflict" }>, choice: Choice | undefined): Hash[] {
  if (choice === "ours") return part.ours;
  if (choice === "theirs") return part.theirs;
  if (choice === "base") return part.base;
  if (choice === "both") return [...part.ours, ...part.theirs];
  if (typeof choice === "object") return choice.blocks;
  throw new Error(`a choice for ${part.id} is ours, theirs, base, both or blocks of your own`);
}
