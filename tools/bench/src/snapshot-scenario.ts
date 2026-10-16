import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSession } from "../../../apps/desktop/src/main/core/database-session";
import { openDatabase } from "../../../apps/desktop/src/main/infra/db";
import { migrate } from "../../../apps/desktop/src/main/infra/migrate";
import { MIGRATIONS } from "../../../apps/desktop/src/main/infra/migrations";
import { AssetService } from "../../../apps/desktop/src/main/features/asset/asset.service";
import { DocumentService } from "../../../apps/desktop/src/main/features/document/document.service";
import { VersionService } from "../../../apps/desktop/src/main/features/version/version.service";
import { projectWorkingCopy } from "../../../apps/desktop/src/main/features/version/working-copy";

export type SnapshotStep = { n: number; ms: number; historySize: number };
export type SnapshotSummary = {
  count: number;
  /** The middle value of the first tenth of the saves and of the last tenth, in milliseconds */
  firstMedianMs: number;
  lastMedianMs: number;
  /** How many times slower the last saves are than the first, a history that slows writes shows here */
  ratio: number;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * A project in a file, with the real version service, that is saved again and again: each save changes one paragraph, so the document keeps its size and only the history grows.
 * It shows whether a save takes longer as the history grows, which would mean that something reads the whole history on every save.
 */
export class SnapshotBench {
  private readonly dir = mkdtempSync(join(tmpdir(), "mt-bench-snap-"));
  private readonly session = new DatabaseSession();
  private readonly versions: VersionService;
  private readonly documents: DocumentService;
  private readonly chapterId: string;
  private paragraphs: string[];
  private readonly latencies: number[] = [];

  constructor(initialBlocks = 1000) {
    const db = openDatabase(join(this.dir, "bench.marktwain"));
    migrate(db, MIGRATIONS);
    this.session.open(db, join(this.dir, "bench.marktwain"));
    this.documents = new DocumentService(this.session);
    const assets = new AssetService(this.session);
    this.documents.seedDefaults();
    this.chapterId = this.documents.list().find((doc) => doc.kind === "chapter")!.id;
    this.paragraphs = Array.from({ length: initialBlocks }, (_, i) => `Paragraph ${i}. ${"The quick brown fox jumps over the lazy dog. ".repeat(3)}`);
    this.documents.save(this.chapterId, `${this.paragraphs.join("\n\n")}\n`);
    this.versions = new VersionService(this.session, projectWorkingCopy(this.documents, assets));
    this.versions.status();
  }

  /** One edit and one save, timed. The document is as long at the end as at the start, so a save that takes longer is slowed by the history and not by the text. */
  step(): SnapshotStep {
    const n = this.latencies.length + 1;
    this.paragraphs[Math.floor(Math.random() * this.paragraphs.length)] = `Edited ${n}. ${"Another sentence for the edit. ".repeat(3)}`;
    this.documents.save(this.chapterId, `${this.paragraphs.join("\n\n")}\n`);
    const started = performance.now();
    this.versions.save(`save ${n}`);
    const ms = performance.now() - started;
    this.latencies.push(ms);
    return { n, ms: Math.round(ms * 10) / 10, historySize: n + 1 };
  }

  summary(): SnapshotSummary {
    const tenth = Math.max(1, Math.floor(this.latencies.length / 10));
    const first = median(this.latencies.slice(0, tenth));
    const last = median(this.latencies.slice(-tenth));
    return { count: this.latencies.length, firstMedianMs: Math.round(first * 10) / 10, lastMedianMs: Math.round(last * 10) / 10, ratio: first > 0 ? Math.round((last / first) * 100) / 100 : 1 };
  }

  close(): void {
    this.session.close();
    rmSync(this.dir, { recursive: true, force: true });
  }
}
