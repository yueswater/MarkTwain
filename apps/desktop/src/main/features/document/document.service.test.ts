import { beforeEach, describe, expect, it } from "@jest/globals";
import { AppError } from "../../core/errors";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase, type Database } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { DocumentService } from "./document.service";

let db: Database;
let session: DatabaseSession;
let service: DocumentService;

beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  session = new DatabaseSession();
  session.open(db, ":memory:");
  let n = 0;
  service = new DocumentService(session, () => `id-${++n}`, () => new Date(1000));
});

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof AppError ? error.code : "not-an-app-error";
  }
  return undefined;
}

describe("seedDefaults", () => {
  it("建立摘要與第一章", () => {
    service.seedDefaults();
    expect(service.list()).toEqual([
      { id: "id-1", kind: "abstract", position: 1, title: "" },
      { id: "id-2", kind: "chapter", position: 1, title: "" },
    ]);
  });
});

describe("list", () => {
  it("依前置、各章、附錄的順序，同種類依位置排列", () => {
    const insert = (id: string, kind: string, position: number) =>
      db.run(
        "INSERT INTO documents (id, kind, position, updated_at) VALUES (?, ?, ?, 0)",
        [id, kind, position],
      );
    insert("a2", "appendix", 2);
    insert("c2", "chapter", 2);
    insert("n1", "denotation", 1);
    insert("c1", "chapter", 1);
    insert("a1", "appendix", 1);
    insert("s1", "abstract", 1);
    insert("k1", "acknowledgement", 1);
    expect(service.list().map((d) => d.id)).toEqual(["s1", "k1", "n1", "c1", "c2", "a1", "a2"]);
  });
});

describe("get", () => {
  it("回傳文件內容", () => {
    service.seedDefaults();
    service.save("id-2", "# 緒論\n");
    expect(service.get("id-2")).toEqual({
      id: "id-2",
      kind: "chapter",
      position: 1,
      title: "",
      text: "# 緒論\n",
    });
  });

  it("找不到時丟出 document.not-found", () => {
    expect(codeOf(() => service.get("nope"))).toBe("document.not-found");
  });
});

describe("save", () => {
  it("把 CRLF 正規化成 LF 再儲存（規格 9.1 節規則 3）", () => {
    service.seedDefaults();
    service.save("id-2", "a\r\n\r\nb\rc");
    expect(service.get("id-2").text).toBe("a\n\nb\nc");
  });

  it("更新修改時間", () => {
    service.seedDefaults();
    service.save("id-2", "x");
    expect(db.get<{ updated_at: number }>("SELECT updated_at FROM documents WHERE id = ?", ["id-2"])).toEqual({
      updated_at: 1000,
    });
  });

  it("找不到時丟出 document.not-found", () => {
    expect(codeOf(() => service.save("nope", "x"))).toBe("document.not-found");
  });
});

describe("沒有開啟的專案", () => {
  it("所有操作都丟出 project.none-open", () => {
    session.close();
    expect(codeOf(() => service.list())).toBe("project.none-open");
    expect(codeOf(() => service.get("x"))).toBe("project.none-open");
    expect(codeOf(() => service.save("x", ""))).toBe("project.none-open");
  });
});
