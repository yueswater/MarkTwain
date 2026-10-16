import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { AssetService, mimeFor } from "./asset.service";

/** A real PNG of one pixel */
const REAL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

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
    writeFileSync(file, REAL_PNG);
    const src = service.importImage(file);
    expect(src).toMatch(/^images\/[0-9a-f]{16}\.png$/);
    const read = service.read(src);
    expect(read?.mime).toBe("image/png");
    expect([...(read?.data ?? [])]).toEqual([...REAL_PNG]);
  });

  it("相同內容只存一份，jpeg 統一成 jpg", () => {
    const a = join(dir, "a.jpeg");
    const b = join(dir, "b.jpg");
    writeFileSync(a, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("same"), Buffer.from([0xff, 0xd9])]));
    writeFileSync(b, readFileSync(a));
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

  it("refuses a file that is not an image although its name says so, and one that is cut short", () => {
    const text = join(dir, "fake.png");
    writeFileSync(text, "this is a text file");
    expect(codeOf(() => service.importImage(text))).toBe("asset.unreadable");
    const cut = join(dir, "cut.png");
    writeFileSync(cut, REAL_PNG.subarray(0, 40));
    expect(codeOf(() => service.importImage(cut))).toBe("asset.unreadable");
    expect(session.isOpen).toBe(true);
  });

  it("mimeFor 依副檔名", () => {
    expect(mimeFor("a.SVG")).toBe("image/svg+xml");
    expect(mimeFor("a.bin")).toBe("application/octet-stream");
  });
});

describe("storePng", () => {
  it("stores PNG bytes under a hash and reads them back, the same bytes give the same path", () => {
    const data = new Uint8Array(REAL_PNG);
    const src = service.storePng(data);
    expect(src).toMatch(/^images\/[0-9a-f]{16}\.png$/);
    expect(service.storePng(data)).toBe(src);
    expect([...(service.read(src)?.data ?? [])]).toEqual([...data]);
  });

  it("refuses a header with nothing after it", () => {
    expect(codeOf(() => service.storePng(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])))).toBe("asset.unsupported");
  });

  it("refuses bytes that are not a PNG", () => {
    expect(codeOf(() => service.storePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])))).toBe("asset.unsupported");
  });
});
