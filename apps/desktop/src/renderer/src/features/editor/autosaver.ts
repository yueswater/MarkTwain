export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Debounced saving, waits a short time after an edit and flushes at once when switching documents or closing.
 * Independent of React for easy testing. Saves run in order so later content is never overwritten by earlier content.
 */
export class Autosaver {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: (() => string) | null = null;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly save: (text: string) => Promise<void>,
    private readonly onStatus: (status: SaveStatus) => void,
    private readonly delayMs = 800,
  ) {}

  /** Marks unsaved changes, read is called only when saving to get the latest text. */
  schedule(read: () => string): void {
    this.pending = read;
    this.onStatus("dirty");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delayMs);
  }

  /** Saves pending changes at once and resolves when all running saves are done. */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const read = this.pending;
    if (!read) return this.chain;
    this.pending = null;

    this.onStatus("saving");
    this.chain = this.chain.then(async () => {
      try {
        await this.save(read());
        if (!this.pending) this.onStatus("saved");
      } catch {
        // Keep this content and retry on the next flush, unless newer content exists
        this.pending ??= read;
        this.onStatus("error");
      }
    });
    return this.chain;
  }
}
