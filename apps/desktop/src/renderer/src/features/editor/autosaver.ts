export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * 防抖儲存：編輯後等一小段時間再存，切換文件或關閉前可立即 `flush`。
 * 與 React 無關，方便測試；儲存一律依序進行，後面的內容不會被前面的覆蓋。
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

  /** 標記有未存的變更；`read` 會在真正儲存時才呼叫，取得當下最新的文字。 */
  schedule(read: () => string): void {
    this.pending = read;
    this.onStatus("dirty");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delayMs);
  }

  /** 立刻儲存未存的變更；等到所有進行中的儲存都結束才回傳。 */
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
        // 保留這次的內容，下一次 flush 會重試（除非已有更新的內容）
        this.pending ??= read;
        this.onStatus("error");
      }
    });
    return this.chain;
  }
}
