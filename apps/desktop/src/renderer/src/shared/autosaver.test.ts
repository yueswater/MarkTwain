import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Autosaver, type SaveStatus } from "./autosaver";

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

function setup(saveImpl?: (text: string) => Promise<void>) {
  const saved: string[] = [];
  const statuses: SaveStatus[] = [];
  const saver = new Autosaver(
    saveImpl ?? (async (text) => void saved.push(text)),
    (s) => statuses.push(s),
    500,
  );
  return { saver, saved, statuses };
}

describe("Autosaver", () => {
  it("連續編輯只在停下來之後存一次，存的是最新內容", async () => {
    const { saver, saved, statuses } = setup();
    let text = "a";
    saver.schedule(() => text);
    text = "ab";
    jest.advanceTimersByTime(300);
    saver.schedule(() => text);
    text = "abc";
    jest.advanceTimersByTime(499);
    expect(saved).toEqual([]);
    jest.advanceTimersByTime(1);
    await saver.flush();
    expect(saved).toEqual(["abc"]);
    expect(statuses).toEqual(["dirty", "dirty", "saving", "saved"]);
  });

  it("flush 立即儲存，沒有變更時什麼都不做", async () => {
    const { saver, saved } = setup();
    await saver.flush();
    saver.schedule(() => "x");
    await saver.flush();
    await saver.flush();
    expect(saved).toEqual(["x"]);
  });

  it("儲存依序進行，不會交錯", async () => {
    const order: string[] = [];
    let release!: () => void;
    const { saver } = setup(async (text) => {
      order.push(`start ${text}`);
      if (text === "1") await new Promise<void>((r) => (release = r));
      order.push(`end ${text}`);
    });
    saver.schedule(() => "1");
    void saver.flush();
    await Promise.resolve();
    saver.schedule(() => "2");
    const second = saver.flush();
    release();
    await second;
    expect(order).toEqual(["start 1", "end 1", "start 2", "end 2"]);
  });

  it("失敗時回報錯誤並保留內容，下次 flush 重試", async () => {
    let fail = true;
    const saved: string[] = [];
    const { saver, statuses } = setup(async (text) => {
      if (fail) throw new Error("disk full");
      saved.push(text);
    });
    saver.schedule(() => "x");
    await saver.flush();
    expect(statuses.at(-1)).toBe("error");
    fail = false;
    await saver.flush();
    expect(saved).toEqual(["x"]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("讀取文字時丟出例外也算失敗，不會讓 flush 拒絕", async () => {
    const { saver, statuses } = setup();
    saver.schedule(() => {
      throw new Error("bad doc");
    });
    await expect(saver.flush()).resolves.toBe(false);
    expect(statuses.at(-1)).toBe("error");
  });
});

describe("Autosaver after a failed save", () => {
  it("tries again by itself, after a wait that grows, and says what is left unsaved until it works", async () => {
    let fail = true;
    const saved: string[] = [];
    const { saver, statuses } = setup(async (text) => {
      if (fail) throw new Error("read only");
      saved.push(text);
    });
    saver.schedule(() => "kept");
    expect(await saver.flush()).toBe(false);
    expect(saver.hasUnsaved()).toBe(true);

    // The first try again is after 2 s, and it fails too, the next wait is longer
    await jest.advanceTimersByTimeAsync(2000);
    expect(statuses.filter((s) => s === "error")).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(4999);
    expect(statuses.filter((s) => s === "error")).toHaveLength(2);
    fail = false;
    await jest.advanceTimersByTimeAsync(1);
    expect(saved).toEqual(["kept"]);
    expect(statuses.at(-1)).toBe("saved");
    expect(saver.hasUnsaved()).toBe(false);
    // Nothing is tried again once it is saved
    await jest.advanceTimersByTimeAsync(60000);
    expect(saved).toEqual(["kept"]);
  });

  it("reports true when everything is saved", async () => {
    const { saver } = setup();
    saver.schedule(() => "x");
    expect(await saver.flush()).toBe(true);
    expect(saver.hasUnsaved()).toBe(false);
  });

  it("does not try again behind the back of a newer edit, that edit has its own save", async () => {
    let fail = true;
    const saved: string[] = [];
    const { saver } = setup(async (text) => {
      if (fail) throw new Error("busy");
      saved.push(text);
    });
    saver.schedule(() => "old");
    await saver.flush();
    fail = false;
    saver.schedule(() => "new");
    await jest.advanceTimersByTimeAsync(500);
    expect(saved).toEqual(["new"]);
  });
});
