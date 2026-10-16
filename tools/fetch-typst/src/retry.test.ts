import { describe, expect, it } from "@jest/globals";
import { PermanentError, withRetry } from "./retry";

const noWait = async () => undefined;

describe("withRetry", () => {
  it("gives the answer of the first try when it works, without waiting", async () => {
    let calls = 0;
    expect(await withRetry(async () => ++calls, { sleep: noWait })).toBe(1);
  });

  it("tries again after a failure and gives the answer of the try that works", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new TypeError("fetch failed");
        return "ok";
      },
      { sleep: noWait },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("waits one second, then two, then four, and gives up after four tries with the last error", async () => {
    const waits: number[] = [];
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error(`failed ${calls}`);
        },
        { sleep: async (ms) => void waits.push(ms) },
      ),
    ).rejects.toThrow("failed 4");
    expect(waits).toEqual([1000, 2000, 4000]);
  });

  it("does not try again for a file that is missing", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new PermanentError("HTTP 404");
        },
        { sleep: noWait },
      ),
    ).rejects.toThrow("HTTP 404");
    expect(calls).toBe(1);
  });
});
