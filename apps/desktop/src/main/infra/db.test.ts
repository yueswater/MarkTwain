import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, type Database } from "./db";

let dir: string;
let db: Database | null = null;

beforeEach(() => {
  // 路徑刻意含空白與中文（規格 9.1 節規則 2）
  dir = mkdtempSync(join(tmpdir(), "marktwain 資料庫 "));
});

afterEach(() => {
  db?.close();
  db = null;
  rmSync(dir, { recursive: true, force: true });
});

describe("openDatabase", () => {
  it("會建立不存在的上層資料夾", () => {
    db = openDatabase(join(dir, "nested", "deeper", "p.marktwain"));
    db.exec("CREATE TABLE t (id INTEGER)");
    expect(db.all("SELECT * FROM t")).toEqual([]);
  });

  it("寫入的資料在重新開啟後仍在（含中文）", () => {
    const file = join(dir, "p.marktwain");
    db = openDatabase(file);
    db.exec("CREATE TABLE t (name TEXT)");
    db.run("INSERT INTO t (name) VALUES (?)", ["論文"]);
    db.close();
    db = openDatabase(file);
    expect(db.all<{ name: string }>("SELECT name FROM t")).toEqual([{ name: "論文" }]);
  });

  it("有啟用外鍵限制", () => {
    db = openDatabase(":memory:");
    db.exec("CREATE TABLE a (id INTEGER PRIMARY KEY)");
    db.exec("CREATE TABLE b (a_id INTEGER REFERENCES a(id))");
    expect(() => db!.run("INSERT INTO b (a_id) VALUES (?)", [999])).toThrow();
  });
});

describe("close", () => {
  it("可以重複呼叫", () => {
    db = openDatabase(":memory:");
    db.close();
    expect(() => db!.close()).not.toThrow();
  });
});

describe("run / get / all", () => {
  beforeEach(() => {
    db = openDatabase(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)");
  });

  it("run 回傳影響的列數與新列的 id", () => {
    const result = db!.run("INSERT INTO t (name) VALUES (?)", ["a"]);
    expect(result.changes).toBe(1);
    expect(Number(result.lastInsertRowid)).toBe(1);
  });

  it("get 找不到時回傳 undefined", () => {
    expect(db!.get("SELECT * FROM t WHERE id = ?", [42])).toBeUndefined();
  });

  it("get 與 all 回傳物件", () => {
    db!.run("INSERT INTO t (name) VALUES (?)", ["a"]);
    db!.run("INSERT INTO t (name) VALUES (?)", ["b"]);
    expect(db!.get<{ name: string }>("SELECT name FROM t WHERE id = ?", [2])).toEqual({ name: "b" });
    expect(db!.all<{ name: string }>("SELECT name FROM t ORDER BY id")).toEqual([
      { name: "a" },
      { name: "b" },
    ]);
  });
});

describe("transaction", () => {
  beforeEach(() => {
    db = openDatabase(":memory:");
    db.exec("CREATE TABLE t (name TEXT)");
  });

  it("成功時提交並回傳 fn 的結果", () => {
    const result = db!.transaction(() => {
      db!.run("INSERT INTO t (name) VALUES (?)", ["a"]);
      return "done";
    });
    expect(result).toBe("done");
    expect(db!.all("SELECT * FROM t")).toHaveLength(1);
  });

  it("丟出例外時回滾並重新丟出", () => {
    expect(() =>
      db!.transaction(() => {
        db!.run("INSERT INTO t (name) VALUES (?)", ["a"]);
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(db!.all("SELECT * FROM t")).toHaveLength(0);
  });

  it("回滾之後可以再開新的交易", () => {
    expect(() => db!.transaction(() => { throw new Error("x"); })).toThrow();
    db!.transaction(() => db!.run("INSERT INTO t (name) VALUES (?)", ["a"]));
    expect(db!.all("SELECT * FROM t")).toHaveLength(1);
  });

  it("不允許巢狀交易", () => {
    expect(() => db!.transaction(() => db!.transaction(() => 1))).toThrow("nested");
  });
});
