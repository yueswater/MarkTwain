export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Debounced saving, waits a short time after an edit and flushes at once when switching documents or closing.
 * Independent of React for easy testing. Saves run in order so later content is never overwritten by earlier content.
 */
export class Autosaver {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: (() => string) | null = null;
  private chain: Promise<void> = Promise.resolve();
  private retry: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  /** True when the last save failed and the text is not on disk */
  private failed = false;

  constructor(
    private readonly save: (text: string) => Promise<void>,
    private readonly onStatus: (status: SaveStatus) => void,
    private delayMs = 800,
  ) {}

  /** The pause after the last edit before saving, can change while the editor is open. */
  setDelay(delayMs: number): void {
    this.delayMs = delayMs;
  }

  /** Marks unsaved changes, read is called only when saving to get the latest text. */
  schedule(read: () => string): void {
    this.pending = read;
    this.onStatus("dirty");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delayMs);
  }

  /** Whether text is waiting to be saved, or could not be saved. */
  hasUnsaved(): boolean {
    return this.pending !== null || this.failed;
  }

  /** The waits between the tries after a save that failed, they grow and stop at the last one. */
  private static readonly RETRY_MS = [2000, 5000, 10000, 30000];

  private armRetry(): void {
    if (this.retry) clearTimeout(this.retry);
    const wait = Autosaver.RETRY_MS[Math.min(this.failures - 1, Autosaver.RETRY_MS.length - 1)] ?? 30000;
    this.retry = setTimeout(() => void this.flush(), wait);
  }

  /** Saves pending changes at once and resolves when all running saves are done, true when nothing is left that is not saved. */
  flush(): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = null;
    }
    const read = this.pending;
    if (!read) return this.chain.then(() => !this.hasUnsaved());
    this.pending = null;

    this.onStatus("saving");
    this.chain = this.chain.then(async () => {
      try {
        await this.save(read());
        this.failed = false;
        this.failures = 0;
        if (!this.pending) this.onStatus("saved");
      } catch {
        // Keep this content and try again after a wait, unless newer content exists, which has its own save coming
        this.pending ??= read;
        this.failed = true;
        this.failures += 1;
        this.onStatus("error");
        if (!this.timer) this.armRetry();
      }
    });
    return this.chain.then(() => !this.hasUnsaved());
  }
}
