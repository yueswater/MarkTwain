import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureDir, readJsonSafe, writeJson } from "./fs.util";

let dir: string;

beforeEach(() => {
  // 路徑刻意含空白與中文：台灣的 Windows 使用者名稱常是中文（規格 9.1 節規則 2）
  dir = mkdtempSync(join(tmpdir(), "marktwain 工具 "));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("readJsonSafe", () => {
  it("檔案不存在時回傳 null", () => {
    expect(readJsonSafe(join(dir, "missing.json"))).toBeNull();
  });

  it("內容損毀時回傳 null", () => {
    const file = join(dir, "bad.json");
    writeFileSync(file, "{ not json");
    expect(readJsonSafe(file)).toBeNull();
  });
});

describe("writeJson", () => {
  it("寫入後可以讀回", () => {
    const file = join(dir, "data.json");
    writeJson(file, { a: 1, b: ["x"] });
    expect(readJsonSafe(file)).toEqual({ a: 1, b: ["x"] });
  });

  it("目標資料夾不存在時會建立", () => {
    const file = join(dir, "nested", "deeper", "data.json");
    writeJson(file, { ok: true });
    expect(readJsonSafe(file)).toEqual({ ok: true });
  });
});

describe("ensureDir", () => {
  it("重複呼叫不會出錯", () => {
    const target = join(dir, "a", "b");
    ensureDir(target);
    expect(() => ensureDir(target)).not.toThrow();
  });
});
