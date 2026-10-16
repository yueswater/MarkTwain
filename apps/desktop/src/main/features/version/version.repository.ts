import type { Hash } from "@marktwain/versioning";
import type { Database } from "../../infra/db";

export type SnapshotRow = { id: string; parent_id: string | null; parent2_id: string | null; message: string; created_at: number };
export type BranchRow = { name: string; head_id: string; base_id: string; created_at: number };
export type SnapDocRow = { doc_id: string; kind: string; title: string; position: number; sequence_hash: string };

const CHUNK = 400;

/** Read and write of the tables of the versions, the only place in this feature that writes SQL. */
export class VersionRepository {
  constructor(private readonly db: Database) {}

  // The things that are stored by their hash, stored once

  putBlock(hash: Hash, text: string): void {
    this.db.run("INSERT OR IGNORE INTO blocks (hash, text) VALUES (?, ?)", [hash, text]);
  }

  putBlob(hash: Hash, data: Uint8Array): void {
    this.db.run("INSERT OR IGNORE INTO blobs (hash, data) VALUES (?, ?)", [hash, data]);
  }

  putSequence(hash: Hash, blocks: Hash[]): void {
    this.db.run("INSERT OR IGNORE INTO sequences (hash, blocks) VALUES (?, ?)", [hash, JSON.stringify(blocks)]);
  }

  blockTexts(hashes: readonly Hash[]): Map<Hash, string> {
    const wanted = [...new Set(hashes)];
    const texts = new Map<Hash, string>();
    for (let from = 0; from < wanted.length; from += CHUNK) {
      const part = wanted.slice(from, from + CHUNK);
      const rows = this.db.all<{ hash: string; text: string }>(`SELECT hash, text FROM blocks WHERE hash IN (${part.map(() => "?").join(",")})`, part);
      for (const row of rows) texts.set(row.hash, row.text);
    }
    return texts;
  }

  blobData(hash: Hash): Uint8Array | undefined {
    return this.db.get<{ data: Uint8Array }>("SELECT data FROM blobs WHERE hash = ?", [hash])?.data;
  }

  sequence(hash: Hash): Hash[] {
    const row = this.db.get<{ blocks: string }>("SELECT blocks FROM sequences WHERE hash = ?", [hash]);
    return row ? (JSON.parse(row.blocks) as Hash[]) : [];
  }

  // Snapshots

  insertSnapshot(row: SnapshotRow): void {
    this.db.run("INSERT INTO snapshots (id, parent_id, parent2_id, message, created_at) VALUES (?, ?, ?, ?, ?)", [row.id, row.parent_id, row.parent2_id, row.message, row.created_at]);
  }

  insertSnapDoc(snapshotId: string, row: SnapDocRow): void {
    this.db.run("INSERT INTO snap_docs (snapshot_id, doc_id, kind, title, position, sequence_hash) VALUES (?, ?, ?, ?, ?, ?)", [snapshotId, row.doc_id, row.kind, row.title, row.position, row.sequence_hash]);
  }

  insertSnapFile(snapshotId: string, path: string, blobHash: Hash): void {
    this.db.run("INSERT INTO snap_files (snapshot_id, path, blob_hash) VALUES (?, ?, ?)", [snapshotId, path, blobHash]);
  }

  snapshot(id: string): SnapshotRow | undefined {
    return this.db.get<SnapshotRow>("SELECT id, parent_id, parent2_id, message, created_at FROM snapshots WHERE id = ?", [id]);
  }

  /** Every snapshot that is a version, which is all of them, drafts are kept apart. */
  snapshots(): SnapshotRow[] {
    return this.db.all<SnapshotRow>("SELECT id, parent_id, parent2_id, message, created_at FROM snapshots");
  }

  snapDocs(snapshotId: string): SnapDocRow[] {
    return this.db.all<SnapDocRow>("SELECT doc_id, kind, title, position, sequence_hash FROM snap_docs WHERE snapshot_id = ?", [snapshotId]);
  }

  snapFiles(snapshotId: string): { path: string; blob_hash: string }[] {
    return this.db.all<{ path: string; blob_hash: string }>("SELECT path, blob_hash FROM snap_files WHERE snapshot_id = ?", [snapshotId]);
  }

  // Branches

  insertBranch(row: BranchRow): void {
    this.db.run("INSERT INTO branches (name, head_id, base_id, created_at) VALUES (?, ?, ?, ?)", [row.name, row.head_id, row.base_id, row.created_at]);
  }

  branches(): BranchRow[] {
    return this.db.all<BranchRow>("SELECT name, head_id, base_id, created_at FROM branches ORDER BY created_at, name");
  }

  branch(name: string): BranchRow | undefined {
    return this.db.get<BranchRow>("SELECT name, head_id, base_id, created_at FROM branches WHERE name = ?", [name]);
  }

  moveHead(name: string, headId: string): void {
    this.db.run("UPDATE branches SET head_id = ? WHERE name = ?", [headId, name]);
  }

  deleteBranch(name: string): void {
    this.db.run("DELETE FROM branches WHERE name = ?", [name]);
  }

  // Drafts and the state

  putDraft(branch: string, content: string, updatedAt: number): void {
    this.db.run("INSERT INTO drafts (branch, content, updated_at) VALUES (?, ?, ?) ON CONFLICT(branch) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at", [branch, content, updatedAt]);
  }

  draft(branch: string): string | undefined {
    return this.db.get<{ content: string }>("SELECT content FROM drafts WHERE branch = ?", [branch])?.content;
  }

  draftBranches(): Set<string> {
    return new Set(this.db.all<{ branch: string }>("SELECT branch FROM drafts").map((row) => row.branch));
  }

  deleteDraft(branch: string): void {
    this.db.run("DELETE FROM drafts WHERE branch = ?", [branch]);
  }

  state(key: string): string | undefined {
    return this.db.get<{ value: string }>("SELECT value FROM version_state WHERE key = ?", [key])?.value;
  }

  setState(key: string, value: string): void {
    this.db.run("INSERT INTO version_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
  }
}
