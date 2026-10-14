import { describe, expect, it } from "@jest/globals";
import { openDatabase } from "../db";
import { migrate } from "../migrate";
import { MIGRATIONS } from "./index";

describe("MIGRATIONS", () => {
  it("可以在空的資料庫上一路套用到最新", () => {
    const db = openDatabase(":memory:");
    expect(migrate(db, MIGRATIONS).to).toBe(MIGRATIONS.length);
    const names = db
      .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .map((row) => row.name);
    expect(names).toEqual(expect.arrayContaining(["project", "documents", "files"]));
    db.close();
  });
});
