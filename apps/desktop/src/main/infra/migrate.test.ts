import { beforeEach, describe, expect, it } from "@jest/globals";
import { AppError } from "../core/errors";
import { openDatabase, type Database } from "./db";
import { currentVersion, migrate, pendingMigrations, type Migration } from "./migrate";

const v1: Migration = { version: 1, name: "a", sql: "CREATE TABLE a (id INTEGER)" };
const v2: Migration = { version: 2, name: "b", sql: "CREATE TABLE b (id INTEGER)" };

let db: Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

function tables(): string[] {
  return db
    .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .map((row) => row.name);
}

describe("migrate", () => {
  it("從 0 升到最新並記錄版本", () => {
    expect(migrate(db, [v1, v2])).toEqual({ from: 0, to: 2 });
    expect(currentVersion(db)).toBe(2);
    expect(tables()).toEqual(["a", "b"]);
  });

  it("已經是最新時不做任何事", () => {
    migrate(db, [v1, v2]);
    expect(migrate(db, [v1, v2])).toEqual({ from: 2, to: 2 });
  });

  it("只套用比目前版本新的 migration", () => {
    migrate(db, [v1]);
    expect(migrate(db, [v1, v2])).toEqual({ from: 1, to: 2 });
    expect(tables()).toEqual(["a", "b"]);
  });

  it("資料庫版本比程式已知的更新時拒絕，且不改動資料", () => {
    migrate(db, [v1, v2]);
    let caught: unknown;
    try {
      migrate(db, [v1]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe("project.too-new");
    expect((caught as AppError).params).toEqual({ found: 2, supported: 1 });
    expect(currentVersion(db)).toBe(2);
  });

  it("其中一個 migration 失敗時整批回滾", () => {
    const bad: Migration = { version: 2, name: "bad", sql: "CREATE TABLE b (id INTEGER); THIS IS NOT SQL" };
    expect(() => migrate(db, [v1, bad])).toThrow();
    expect(currentVersion(db)).toBe(0);
    expect(tables()).toEqual([]);
  });

  it("版本不是從 1 連續遞增時拒絕", () => {
    expect(() => migrate(db, [v2])).toThrow("version 1");
    expect(() => migrate(db, [v1, { ...v2, version: 3 }])).toThrow("version 2");
  });
});

describe("pendingMigrations", () => {
  it("回傳還沒套用的數量", () => {
    expect(pendingMigrations(db, [v1, v2])).toBe(2);
    migrate(db, [v1]);
    expect(pendingMigrations(db, [v1, v2])).toBe(1);
    migrate(db, [v1, v2]);
    expect(pendingMigrations(db, [v1, v2])).toBe(0);
  });
});
