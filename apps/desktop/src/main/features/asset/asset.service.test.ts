import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { AssetService, mimeFor } from "./asset.service";

let dir: string;
let session: DatabaseSession;
let service: AssetService;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "marktwain 圖片 "));
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  session = new DatabaseSession();
  session.open(db, ":memory:");
  service = new AssetService(session, () => new Date(0));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? e.code : "other";
  }
  return undefined;
};

describe("AssetService", () => {
  it("存進專案後可以用回傳的路徑讀回，路徑含內容雜湊", () => {
    const file = join(dir, "圖 一.PNG");
    writeFileSync(file, Buffer.from([1, 2, 3]));
    const src = service.importImage(file);
    expect(src).toMatch(/^images\/[0-9a-f]{16}\.png$/);
    const read = service.read(src);
    expect(read?.mime).toBe("image/png");
    expect([...(read?.data ?? [])]).toEqual([1, 2, 3]);
  });

  it("相同內容只存一份，jpeg 統一成 jpg", () => {
    const a = join(dir, "a.jpeg");
    const b = join(dir, "b.jpg");
    writeFileSync(a, "same");
    writeFileSync(b, "same");
    expect(service.importImage(a)).toBe(service.importImage(b));
  });

  it("不支援的副檔名、不存在的檔案各回傳對應的錯誤", () => {
    const text = join(dir, "a.txt");
    writeFileSync(text, "x");
    expect(codeOf(() => service.importImage(text))).toBe("asset.unsupported");
    expect(codeOf(() => service.importImage(join(dir, "none.png")))).toBe("asset.unreadable");
  });

  it("沒有開啟專案或找不到檔案時 read 回傳 null", () => {
    expect(service.read("images/none.png")).toBeNull();
    session.close();
    expect(service.read("images/none.png")).toBeNull();
  });

  it("mimeFor 依副檔名", () => {
    expect(mimeFor("a.SVG")).toBe("image/svg+xml");
    expect(mimeFor("a.bin")).toBe("application/octet-stream");
  });
});
