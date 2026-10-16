import { joinBlocks, splitBlocks } from "@marktwain/schema";
import {
  MAIN_BRANCH,
  commonAncestor,
  diffContent,
  hashBytes,
  hashText,
  isAncestor,
  resolveMerge,
  threeWayMerge,
  type Choice,
  type DocumentEntry,
  type Hash,
  type MergeConflict,
  type Snapshot,
  type SnapshotContent,
} from "@marktwain/versioning";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { ChangeView, ChoiceInput, CompareView, ConflictView, MergePreview, VersionEntry, VersionStatus } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { VersionRepository } from "./version.repository";
import type { Working, WorkingCopy } from "./working-copy";

const CURRENT = "current_branch";

/** The working copy with the hash of every block and every file. The text and the bytes stay, so they can be stored when a version is made. */
type Hashed = {
  content: SnapshotContent;
  texts: Map<Hash, string>;
  blobs: Map<Hash, Uint8Array>;
  sequences: Map<string, Hash[]>;
};

const sequenceHash = (blocks: readonly Hash[]) => hashText(JSON.stringify(blocks));

/**
 * The versions of the project: saving, branches, history, restoring, comparing and merging a branch into the main line.
 * The documents and the files that the person works on are the working copy, which this service reads and writes through the WorkingCopy it is given.
 * Every operation that changes more than one table is one transaction, so a failure or a kill leaves the project as it was.
 */
export class VersionService {
  /** The hash of a document that has not changed since it was last read, by id, so that typing in one document does not hash the others */
  private readonly documentCache = new Map<string, { text: string; blocks: Hash[]; texts: Map<Hash, string> }>();
  private readonly fileCache = new Map<string, { stamp: number; size: number; hash: Hash }>();

  constructor(
    private readonly session: DatabaseSession,
    private readonly workingCopy: WorkingCopy,
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  private repository(): VersionRepository {
    return new VersionRepository(this.session.db);
  }

  // The working copy, as content

  private hashWorking(working: Working): Hashed {
    const documents: SnapshotContent["documents"] = {};
    const texts = new Map<Hash, string>();
    const sequences = new Map<string, Hash[]>();
    const seen = new Set<string>();
    for (const document of working.documents) {
      seen.add(document.id);
      let cached = this.documentCache.get(document.id);
      if (!cached || cached.text !== document.text) {
        const parts = splitBlocks(document.text);
        const blockTexts = new Map<Hash, string>();
        const blocks = parts.map((part) => {
          const hash = hashText(part);
          blockTexts.set(hash, part);
          return hash;
        });
        cached = { text: document.text, blocks, texts: blockTexts };
        this.documentCache.set(document.id, cached);
      }
      for (const [hash, text] of cached.texts) texts.set(hash, text);
      sequences.set(sequenceHash(cached.blocks), cached.blocks);
      documents[document.id] = { kind: document.kind, title: document.title, position: document.position, blocks: cached.blocks };
    }
    for (const id of this.documentCache.keys()) if (!seen.has(id)) this.documentCache.delete(id);

    const files: SnapshotContent["files"] = {};
    const blobs = new Map<Hash, Uint8Array>();
    for (const file of working.files) {
      let cached = this.fileCache.get(file.path);
      if (!cached || cached.stamp !== file.stamp || cached.size !== file.data.length) {
        cached = { stamp: file.stamp, size: file.data.length, hash: hashBytes(file.data) };
        this.fileCache.set(file.path, cached);
      }
      files[file.path] = cached.hash;
      blobs.set(cached.hash, file.data);
    }
    return { content: { documents, files }, texts, blobs, sequences };
  }

  /** Whether the working copy is what a snapshot holds, by the hashes that the snapshot has stored. */
  private sameAsSnapshot(hashed: Hashed, snapshotId: string): boolean {
    const repository = this.repository();
    const docs = repository.snapDocs(snapshotId);
    const files = repository.snapFiles(snapshotId);
    if (docs.length !== Object.keys(hashed.content.documents).length || files.length !== Object.keys(hashed.content.files).length) return false;
    for (const row of docs) {
      const document = hashed.content.documents[row.doc_id];
      if (!document || document.kind !== row.kind || document.title !== row.title || document.position !== row.position || sequenceHash(document.blocks) !== row.sequence_hash) return false;
    }
    return files.every((row) => hashed.content.files[row.path] === row.blob_hash);
  }

  /** Stores the blocks, the sequences and the files that are new, so that content made of these hashes can be read back. */
  private store(hashed: Hashed): void {
    const repository = this.repository();
    const present = new Set([...hashed.texts.keys()].filter((hash) => repository.blockTexts([hash]).size > 0));
    // One query for each hundred hashes would be quicker, but a document that did not change is skipped below, so only changed ones get here
    for (const [hash, text] of hashed.texts) if (!present.has(hash)) repository.putBlock(hash, text);
    for (const [hash, blocks] of hashed.sequences) repository.putSequence(hash, blocks);
    for (const [hash, data] of hashed.blobs) repository.putBlob(hash, data);
  }

  private loadSnapshot(snapshotId: string): SnapshotContent {
    const repository = this.repository();
    const documents: SnapshotContent["documents"] = {};
    for (const row of repository.snapDocs(snapshotId)) {
      documents[row.doc_id] = { kind: row.kind, title: row.title, position: row.position, blocks: repository.sequence(row.sequence_hash) };
    }
    const files: SnapshotContent["files"] = {};
    for (const row of repository.snapFiles(snapshotId)) files[row.path] = row.blob_hash;
    return { documents, files };
  }

  /** Writes the content of a snapshot into the documents and the files. */
  private apply(content: SnapshotContent): void {
    const repository = this.repository();
    const texts = repository.blockTexts(Object.values(content.documents).flatMap((document) => document.blocks));
    const documents = Object.entries(content.documents).map(([id, document]) => ({
      id,
      kind: document.kind,
      title: document.title,
      position: document.position,
      text: joinBlocks(document.blocks.map((hash) => texts.get(hash) ?? "")),
    }));
    const files = Object.entries(content.files).map(([path, hash]) => ({ path, data: repository.blobData(hash) ?? new Uint8Array() }));
    this.workingCopy.write({ documents, files });
  }

  private writeSnapshot(content: SnapshotContent, parentId: string | null, parent2Id: string | null, message: string): string {
    const repository = this.repository();
    const id = this.newId();
    repository.insertSnapshot({ id, parent_id: parentId, parent2_id: parent2Id, message, created_at: this.now().getTime() });
    for (const [docId, document] of Object.entries(content.documents)) {
      // A merge makes sequences that no document had, so the sequence is stored here and not only when the working copy is read
      const hash = sequenceHash(document.blocks);
      repository.putSequence(hash, document.blocks);
      repository.insertSnapDoc(id, { doc_id: docId, kind: document.kind, title: document.title, position: document.position, sequence_hash: hash });
    }
    for (const [path, hash] of Object.entries(content.files)) repository.insertSnapFile(id, path, hash);
    return id;
  }

  // State

  /** A project that was made before versions existed gets its first version from what it holds, and the main line. */
  private ensureStarted(): void {
    const repository = this.repository();
    if (repository.branches().length > 0) return;
    this.session.db.transaction(() => {
      const hashed = this.hashWorking(this.workingCopy.read());
      this.store(hashed);
      const id = this.writeSnapshot(hashed.content, null, null, "");
      repository.insertBranch({ name: MAIN_BRANCH, head_id: id, base_id: id, created_at: this.now().getTime() });
      repository.setState(CURRENT, MAIN_BRANCH);
    });
  }

  private current(): string {
    return this.repository().state(CURRENT) ?? MAIN_BRANCH;
  }

  private requireBranch(name: string) {
    const branch = this.repository().branch(name);
    if (!branch) throw new AppError(ErrorCode.VersionBranchNotFound);
    return branch;
  }

  status(): VersionStatus {
    this.ensureStarted();
    const repository = this.repository();
    const current = this.current();
    const head = this.requireBranch(current).head_id;
    const drafts = repository.draftBranches();
    return {
      branch: current,
      headId: head,
      dirty: !this.sameAsSnapshot(this.hashWorking(this.workingCopy.read()), head),
      branches: repository.branches().map((branch) => ({ name: branch.name, headId: branch.head_id, baseId: branch.base_id, createdAt: branch.created_at, isCurrent: branch.name === current, hasDraft: drafts.has(branch.name) })),
    };
  }

  // Operations

  /** Makes a version of the documents as they are, on the branch that is open. */
  save(message: string): VersionStatus {
    // As a commit in git needs a message, a version needs to say what was changed
    if (message.trim() === "") throw new AppError(ErrorCode.VersionMessageEmpty);
    this.ensureStarted();
    this.session.db.transaction(() => {
      const repository = this.repository();
      const current = this.current();
      const head = this.requireBranch(current).head_id;
      const hashed = this.hashWorking(this.workingCopy.read());
      if (this.sameAsSnapshot(hashed, head)) throw new AppError(ErrorCode.VersionNothingToSave);
      this.store(hashed);
      repository.moveHead(current, this.writeSnapshot(hashed.content, head, null, message.trim()));
      repository.deleteDraft(current);
    });
    return this.status();
  }

  /** Starts a branch from the latest version of the one that is open. What was changed and not saved goes with the person to the new branch. */
  startBranch(name: string): VersionStatus {
    this.ensureStarted();
    const trimmed = name.trim();
    if (trimmed === "") throw new AppError(ErrorCode.VersionNameEmpty);
    const repository = this.repository();
    if (repository.branch(trimmed)) throw new AppError(ErrorCode.VersionNameTaken, { name: trimmed });
    this.session.db.transaction(() => {
      const head = this.requireBranch(this.current()).head_id;
      repository.insertBranch({ name: trimmed, head_id: head, base_id: head, created_at: this.now().getTime() });
      repository.setState(CURRENT, trimmed);
    });
    return this.status();
  }

  /** Opens another branch. Changes that were not saved wait on the branch that is left and come back when it is opened again. */
  switchBranch(name: string): VersionStatus {
    this.ensureStarted();
    this.session.db.transaction(() => this.switchInside(name));
    return this.status();
  }

  private switchInside(name: string): void {
    const repository = this.repository();
    const target = this.requireBranch(name);
    const current = this.current();
    if (name === current) return;
    const hashed = this.hashWorking(this.workingCopy.read());
    if (!this.sameAsSnapshot(hashed, this.requireBranch(current).head_id)) {
      this.store(hashed);
      repository.putDraft(current, JSON.stringify(hashed.content), this.now().getTime());
    }
    const draft = repository.draft(name);
    this.apply(draft ? (JSON.parse(draft) as SnapshotContent) : this.loadSnapshot(target.head_id));
    repository.deleteDraft(name);
    repository.setState(CURRENT, name);
  }

  /** Throws a branch away, with the changes on it. The main line cannot be thrown away. Its versions stay in the file, but no history leads to them. */
  discardBranch(name: string): VersionStatus {
    this.ensureStarted();
    if (name === MAIN_BRANCH) throw new AppError(ErrorCode.VersionMainProtected);
    this.requireBranch(name);
    this.session.db.transaction(() => {
      const repository = this.repository();
      if (this.current() === name) {
        // The documents are those of the branch that goes, they are replaced by the main line and not kept as a draft
        const main = this.requireBranch(MAIN_BRANCH);
        const draft = repository.draft(MAIN_BRANCH);
        this.apply(draft ? (JSON.parse(draft) as SnapshotContent) : this.loadSnapshot(main.head_id));
        repository.deleteDraft(MAIN_BRANCH);
        repository.setState(CURRENT, MAIN_BRANCH);
      }
      repository.deleteBranch(name);
    });
    return this.status();
  }

  /** The versions that lead to the latest one of the branch that is open, newest first. */
  history(): VersionEntry[] {
    this.ensureStarted();
    const repository = this.repository();
    const graph = new Map<string, Snapshot>(repository.snapshots().map((row) => [row.id, { id: row.id, parentId: row.parent_id, parent2Id: row.parent2_id, message: row.message, createdAt: row.created_at }]));
    const head = this.requireBranch(this.current()).head_id;
    const heads = new Map<string, string[]>();
    for (const branch of repository.branches()) heads.set(branch.head_id, [...(heads.get(branch.head_id) ?? []), branch.name]);
    const reached = new Set<string>();
    const queue = [head];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (reached.has(id)) continue;
      reached.add(id);
      const snapshot = graph.get(id);
      if (snapshot) queue.push(...[snapshot.parentId, snapshot.parent2Id].filter((parent): parent is string => parent !== null));
    }
    return [...reached]
      .map((id) => graph.get(id) as Snapshot)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((snapshot) => ({ id: snapshot.id, message: snapshot.message, createdAt: snapshot.createdAt, parentId: snapshot.parentId, parent2Id: snapshot.parent2Id, heads: heads.get(snapshot.id) ?? [] }));
  }

  /** Puts the documents back as they are in the latest version of the branch that is open, as git restore does with the working tree. */
  discardChanges(): VersionStatus {
    this.ensureStarted();
    this.session.db.transaction(() => {
      const repository = this.repository();
      const current = this.current();
      this.apply(this.loadSnapshot(this.requireBranch(current).head_id));
      repository.deleteDraft(current);
    });
    return this.status();
  }

  /** The text of a document in the latest version of the branch that is open, null when that version has no such document. */
  headText(documentId: string): string | null {
    this.ensureStarted();
    const repository = this.repository();
    const row = repository.snapDoc(this.requireBranch(this.current()).head_id, documentId);
    if (!row) return null;
    const blocks = repository.sequence(row.sequence_hash);
    const texts = repository.blockTexts(blocks);
    return joinBlocks(blocks.map((hash) => texts.get(hash) ?? ""));
  }

  /** Puts the documents as they were in a version, and saves that as a new version after the latest one, so nothing of the history is rewritten. */
  restore(snapshotId: string, message: string): VersionStatus {
    this.ensureStarted();
    const repository = this.repository();
    if (!repository.snapshot(snapshotId)) throw new AppError(ErrorCode.VersionSnapshotNotFound);
    this.session.db.transaction(() => {
      const current = this.current();
      const head = this.requireBranch(current).head_id;
      const content = this.loadSnapshot(snapshotId);
      const headContent = this.loadSnapshot(head);
      if (JSON.stringify(sortedContent(content)) === JSON.stringify(sortedContent(headContent))) throw new AppError(ErrorCode.VersionNothingToSave);
      this.apply(content);
      repository.moveHead(current, this.writeSnapshot(content, head, null, message.trim()));
      repository.deleteDraft(current);
    });
    return this.status();
  }

  /** What differs between two versions, as the text of the blocks. */
  compare(fromId: string, toId: string): CompareView {
    this.ensureStarted();
    const repository = this.repository();
    if (!repository.snapshot(fromId) || !repository.snapshot(toId)) throw new AppError(ErrorCode.VersionSnapshotNotFound);
    const from = this.loadSnapshot(fromId);
    const to = this.loadSnapshot(toId);
    const diff = diffContent(from, to);
    const wanted: Hash[] = [];
    for (const document of diff.documents) {
      for (const change of document.changes) {
        if (change.type === "added" || change.type === "removed") wanted.push(change.hash);
        else if (change.type === "modified") wanted.push(change.from, change.to);
      }
    }
    const texts = repository.blockTexts(wanted);
    const text = (hash: Hash) => texts.get(hash) ?? "";
    return {
      documents: diff.documents.map((document) => {
        const entry = to.documents[document.docId] ?? from.documents[document.docId];
        const changes: ChangeView[] = [];
        for (const change of document.changes) {
          const last = changes[changes.length - 1];
          if (change.type === "same") {
            if (last?.type === "same") last.count += 1;
            else changes.push({ type: "same", count: 1 });
          } else if (change.type === "added") changes.push({ type: "added", after: text(change.hash) });
          else if (change.type === "removed") changes.push({ type: "removed", before: text(change.hash) });
          else changes.push({ type: "modified", before: text(change.from), after: text(change.to) });
        }
        return { docId: document.docId, title: entry?.title ?? "", kind: entry?.kind ?? "", status: document.status as "added" | "removed" | "changed", fields: document.fields, changes };
      }),
      files: diff.files,
    };
  }

  // Merging into the main line

  private mergeInputs(source: string) {
    const repository = this.repository();
    if (source === MAIN_BRANCH) throw new AppError(ErrorCode.VersionNothingToMerge);
    const theirsHead = this.requireBranch(source).head_id;
    const oursHead = this.requireBranch(MAIN_BRANCH).head_id;
    const graph = new Map<string, Snapshot>(repository.snapshots().map((row) => [row.id, { id: row.id, parentId: row.parent_id, parent2Id: row.parent2_id, message: row.message, createdAt: row.created_at }]));
    return { oursHead, theirsHead, graph };
  }

  /** What merging a branch into the main line would do, and the conflicts if there are any. Nothing is written. */
  previewMerge(source: string): MergePreview {
    this.ensureStarted();
    const { oursHead, theirsHead, graph } = this.mergeInputs(source);
    if (isAncestor(graph, theirsHead, oursHead)) return { kind: "up-to-date" };
    if (isAncestor(graph, oursHead, theirsHead)) return { kind: "fast-forward" };
    const result = this.computeMerge(graph, oursHead, theirsHead);
    return result.draft.conflicts.length === 0 ? { kind: "clean" } : { kind: "conflicts", conflicts: this.conflictViews(result.draft.conflicts, result.ours, result.theirs) };
  }

  private computeMerge(graph: Map<string, Snapshot>, oursHead: string, theirsHead: string) {
    const baseId = commonAncestor(graph, oursHead, theirsHead);
    const ours = this.loadSnapshot(oursHead);
    const theirs = this.loadSnapshot(theirsHead);
    return { ...threeWayMerge(baseId ? this.loadSnapshot(baseId) : null, ours, theirs), ours, theirs };
  }

  private conflictViews(conflicts: MergeConflict[], ours: SnapshotContent, theirs: SnapshotContent): ConflictView[] {
    const repository = this.repository();
    const texts = repository.blockTexts(conflicts.flatMap((conflict) => (conflict.type === "blocks" ? [...conflict.base, ...conflict.ours, ...conflict.theirs] : [])));
    const text = (hashes: Hash[]) => hashes.map((hash) => texts.get(hash) ?? "");
    const titleOf = (docId: string) => (theirs.documents[docId] ?? ours.documents[docId])?.title ?? "";
    const kindOf = (docId: string) => (theirs.documents[docId] ?? ours.documents[docId])?.kind ?? "";
    return conflicts.map((conflict): ConflictView => {
      if (conflict.type === "blocks") return { id: conflict.id, type: "blocks", docId: conflict.docId, title: titleOf(conflict.docId), kind: kindOf(conflict.docId), base: text(conflict.base), ours: text(conflict.ours), theirs: text(conflict.theirs) };
      if (conflict.type === "field") return { ...conflict, title: titleOf(conflict.docId), kind: kindOf(conflict.docId) };
      if (conflict.type === "file") return { id: conflict.id, type: "file", path: conflict.path, base: conflict.base !== null, ours: conflict.ours !== null, theirs: conflict.theirs !== null };
      return { ...conflict, title: titleOf(conflict.docId), kind: kindOf(conflict.docId) };
    });
  }

  /**
   * Merges a branch into the main line and opens the main line. When there are conflicts every one needs a choice, or nothing is written.
   * It all happens in one transaction: the new version, the move of the main line, the documents, and the end of the branch if it is to go.
   */
  merge(source: string, resolutions: Record<string, ChoiceInput>, deleteSource: boolean, message: string): VersionStatus {
    this.ensureStarted();
    const { oursHead, theirsHead, graph } = this.mergeInputs(source);
    this.session.db.transaction(() => {
      const repository = this.repository();
      const current = this.current();
      // The documents must be what the branch that is open holds, since they are replaced
      const working = this.hashWorking(this.workingCopy.read());
      if (!this.sameAsSnapshot(working, this.requireBranch(current).head_id)) throw new AppError(ErrorCode.VersionUnsavedChanges);
      if (current !== MAIN_BRANCH && repository.draft(MAIN_BRANCH) !== undefined) throw new AppError(ErrorCode.VersionMainHasDraft);

      let content: SnapshotContent;
      let newHead: string;
      if (isAncestor(graph, theirsHead, oursHead)) throw new AppError(ErrorCode.VersionNothingToMerge);
      if (isAncestor(graph, oursHead, theirsHead)) {
        content = this.loadSnapshot(theirsHead);
        newHead = theirsHead;
      } else {
        const result = this.computeMerge(graph, oursHead, theirsHead);
        const choices = this.choicesOf(result.draft.conflicts, resolutions);
        content = normalizePositions(result.draft.conflicts.length === 0 ? (result.content as SnapshotContent) : resolveMerge(result.draft, choices));
        newHead = this.writeSnapshot(content, oursHead, theirsHead, message.trim());
      }
      this.apply(content);
      repository.moveHead(MAIN_BRANCH, newHead);
      repository.deleteDraft(MAIN_BRANCH);
      repository.setState(CURRENT, MAIN_BRANCH);
      if (deleteSource) repository.deleteBranch(source);
      else repository.deleteDraft(source);
    });
    return this.status();
  }

  private choicesOf(conflicts: MergeConflict[], inputs: Record<string, ChoiceInput>): Record<string, Choice> {
    const missing = conflicts.filter((conflict) => inputs[conflict.id] === undefined);
    if (missing.length > 0) throw new AppError(ErrorCode.VersionConflicts, { count: String(missing.length) });
    const repository = this.repository();
    const choices: Record<string, Choice> = {};
    for (const conflict of conflicts) {
      const input = inputs[conflict.id] as ChoiceInput;
      if (typeof input === "object") {
        // A text of the person's own, cut into blocks and stored
        const blocks = splitBlocks(input.text).map((part) => {
          const hash = hashText(part);
          if (repository.blockTexts([hash]).size === 0) repository.putBlock(hash, part);
          return hash;
        });
        choices[conflict.id] = { blocks };
      } else choices[conflict.id] = input;
    }
    return choices;
  }
}

/** The content with its keys in order, so two contents can be compared as text. */
function sortedContent(content: SnapshotContent): unknown {
  return {
    documents: Object.fromEntries(Object.entries(content.documents).sort(([a], [b]) => (a < b ? -1 : 1))),
    files: Object.fromEntries(Object.entries(content.files).sort(([a], [b]) => (a < b ? -1 : 1))),
  };
}

/** The documents of a kind are numbered 1 to n, as the rest of the app keeps them. A merge can leave two with the same number, or a gap. */
function normalizePositions(content: SnapshotContent): SnapshotContent {
  const byKind = new Map<string, [string, DocumentEntry][]>();
  for (const entry of Object.entries(content.documents)) byKind.set(entry[1].kind, [...(byKind.get(entry[1].kind) ?? []), entry]);
  const documents: SnapshotContent["documents"] = {};
  for (const entries of byKind.values()) {
    entries
      .sort(([idA, a], [idB, b]) => a.position - b.position || (idA < idB ? -1 : 1))
      .forEach(([id, entry], index) => {
        documents[id] = { ...entry, position: index + 1 };
      });
  }
  return { documents, files: content.files };
}
