import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "../core/errors";
import { describeError, log, readLogTail, setLogFile } from "./logger";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "marktwain-log "));
  file = join(dir, "logs", "marktwain.log");
  setLogFile(file, () => new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  setLogFile(null);
  rmSync(dir, { recursive: true, force: true });
});

describe("log", () => {
  it("每行一筆，有時間、層級與標籤", () => {
    log.info("project", "upgraded schema 3 to 4");
    log.error("ipc", "line one\nline two");
    expect(readFileSync(file, "utf8")).toBe(
      "2026-10-19T08:00:00.000Z INFO project upgraded schema 3 to 4\n2026-10-19T08:00:00.000Z ERROR ipc line one line two\n",
    );
  });

  it("沒有指定檔案時什麼都不寫", () => {
    setLogFile(null);
    expect(() => log.info("x", "y")).not.toThrow();
    expect(readLogTail(10)).toEqual([]);
  });

  it("檔案太大時移到 .1，讀尾端會接上舊檔", () => {
    log.info("a", "first");
    writeFileSync(file, `${"x".repeat(300 * 1024)}\n`);
    log.info("a", "second");
    const tail = readLogTail(2);
    expect(tail).toHaveLength(2);
    expect(tail[1]).toContain("second");
  });
});

describe("describeError", () => {
  it("只寫錯誤的種類與代碼，不寫訊息", () => {
    const error = Object.assign(new Error("cannot open /Users/me/我的論文.marktwain 秘密內文"), { code: "ENOENT" });
    const text = describeError(error);
    expect(text).toContain("Error code=ENOENT");
    expect(text).not.toContain("秘密內文");
    expect(text).not.toContain("我的論文");
  });

  it("應用程式錯誤寫代碼與參數名，不寫參數值", () => {
    const text = describeError(new AppError("version.name-taken" as never, { name: "秘密分支" }));
    expect(text).toContain("AppError");
    expect(text).toContain("params=name");
    expect(text).not.toContain("秘密分支");
  });

  it("堆疊只留檔名，不留資料夾", () => {
    const error = new Error("x");
    error.stack = "Error: x\n    at run (/Users/me/secret folder/app/out/main/index.js:10:5)\n    at /Users/me/secret folder/other.js:1:1";
    const text = describeError(error);
    expect(text).toContain("(index.js:10:5)");
    expect(text).toContain("at other.js:1:1");
    expect(text).not.toContain("secret folder");
  });

  it("不是 Error 的東西只寫型別", () => {
    expect(describeError("some thesis text")).toBe("string");
  });
});
