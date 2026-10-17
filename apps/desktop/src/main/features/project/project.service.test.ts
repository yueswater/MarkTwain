import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "../../core/errors";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase } from "../../infra/db";
import { migrate, type Migration } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { DocumentService } from "../document/document.service";
import { ProjectService } from "./project.service";

let dir: string;
let file: string;
let session: DatabaseSession;
let documents: DocumentService;

const NOW = new Date(Date.UTC(2026, 9, 14, 13, 30, 5));

beforeEach(() => {
  // Path deliberately contains a space and Chinese characters
  dir = mkdtempSync(join(tmpdir(), "marktwain 專案 "));
  file = join(dir, "我的論文.marktwain");
  session = new DatabaseSession();
  documents = new DocumentService(session);
});

afterEach(() => {
  session.close();
  rmSync(dir, { recursive: true, force: true });
});

function service(migrations: Migration[] = MIGRATIONS): ProjectService {
  return new ProjectService(session, documents, migrations, () => NOW);
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof AppError ? error.code : "not-an-app-error";
  }
  return undefined;
}

describe("create", () => {
  it("建立檔案、預設文件，並成為目前的專案", () => {
    const info = service().create(file, "我的論文");
    expect(info.name).toBe("我的論文");
    expect(info.path).toBe(file);
    expect(info.documents.map((d) => d.kind)).toEqual(["abstract", "abstractEn", "chapter"]);
    expect(existsSync(file)).toBe(true);
    expect(service().current()?.name).toBe("我的論文");
  });

  it("目標位置已有檔案時拒絕，且不動它", () => {
    writeFileSync(file, "precious");
    expect(codeOf(() => service().create(file, "x"))).toBe("project.exists");
  });

  it("建立失敗時不留下檔案", () => {
    const broken: Migration[] = [{ version: 1, name: "bad", sql: "THIS IS NOT SQL" }];
    expect(() => service(broken).create(file, "x")).toThrow();
    expect(existsSync(file)).toBe(false);
  });
});

describe("open", () => {
  it("儲存的文件內容在關閉再開啟後仍在", () => {
    const created = service().create(file, "我的論文");
    const chapter = created.documents.find((d) => d.kind === "chapter")!;
    documents.save(chapter.id, "# 緒論\n\n內文\n");
    service().close();
    expect(service().current()).toBeNull();

    const info = service().open(file);
    expect(info.name).toBe("我的論文");
    expect(documents.get(chapter.id).text).toBe("# 緒論\n\n內文\n");
  });

  it("檔案不存在時丟出 project.not-found", () => {
    expect(codeOf(() => service().open(file))).toBe("project.not-found");
  });

  it("不是 SQLite 的檔案丟出 project.invalid", () => {
    writeFileSync(file, "just some text, not a database");
    expect(codeOf(() => service().open(file))).toBe("project.invalid");
  });

  it("別的程式建立的 SQLite 檔案丟出 project.invalid，且不被改動", () => {
    const other = openDatabase(file);
    other.exec("CREATE TABLE notes (id INTEGER)");
    other.close();
    expect(codeOf(() => service().open(file))).toBe("project.invalid");
    const check = openDatabase(file);
    expect(check.all("SELECT name FROM sqlite_master WHERE type = 'table'")).toEqual([{ name: "notes" }]);
    check.close();
  });

  it("檔案比程式新時丟出 project.too-new，並保留原本開啟的專案", () => {
    // One migration after the last that this program has
    const later: Migration = { version: MIGRATIONS.length + 1, name: "later", sql: "CREATE TABLE later (id INTEGER)" };
    const newer = join(dir, "newer.marktwain");
    service([...MIGRATIONS, later]).create(newer, "新");
    session.close();

    service().create(file, "舊");
    expect(codeOf(() => service().open(newer))).toBe("project.too-new");
    expect(service().current()?.name).toBe("舊");
  });

  it("舊版檔案先備份再升級，內容保留", () => {
    const created = service().create(file, "我的論文");
    const chapter = created.documents.find((d) => d.kind === "chapter")!;
    documents.save(chapter.id, "keep me");
    session.close();

    const later: Migration = { version: MIGRATIONS.length + 1, name: "later", sql: "CREATE TABLE later (id INTEGER)" };
    service([...MIGRATIONS, later]).open(file);

    const backups = readdirSync(dir).filter((name) => name.includes(".bak-"));
    expect(backups).toEqual(["我的論文.marktwain.bak-20261014-133005"]);
    expect(documents.get(chapter.id).text).toBe("keep me");
    expect(
      session.db.all("SELECT name FROM sqlite_master WHERE name = 'later'"),
    ).toHaveLength(1);
  });

  it("已是最新版時不備份", () => {
    service().create(file, "x");
    session.close();
    service().open(file);
    expect(readdirSync(dir).filter((name) => name.includes(".bak-"))).toEqual([]);
  });

  it("開啟另一個專案會關閉前一個", () => {
    const a = join(dir, "a.marktwain");
    service().create(a, "A");
    service().create(file, "B");
    expect(service().current()?.name).toBe("B");
    service().open(a);
    expect(service().current()?.name).toBe("A");
  });
});

describe("engine", () => {
  it("is Typst unless the project is created for another one, and is kept when the project is opened again", () => {
    expect(service().create(file, "a").engine).toBe("typst");
    service().close();
    const latexFile = join(dir, "latex.marktwain");
    expect(service().create(latexFile, "b", "latex").engine).toBe("latex");
    service().close();
    expect(service().open(latexFile).engine).toBe("latex");
    expect(service().current()?.engine).toBe("latex");
  });

  it("refuses an engine that is not available and leaves no file", () => {
    expect(codeOf(() => service().create(file, "w", "word"))).toBe("project.engine-unavailable");
    expect(codeOf(() => service().create(file, "w", "nope" as never))).toBe("project.engine-unavailable");
    expect(existsSync(file)).toBe(false);
  });

  it("gives a project from before the choice the Typst engine, the only output it had", () => {
    const db = openDatabase(file);
    migrate(db, MIGRATIONS.filter((m) => m.version <= 2));
    db.run("INSERT INTO project (id, name, created_at) VALUES (1, 'old', 0)");
    db.close();
    expect(service().open(file).engine).toBe("typst");
  });
});

describe("a file that holds no project", () => {
  it("is refused and left as it was, an empty file and an empty SQLite file alike", () => {
    writeFileSync(file, "");
    expect(codeOf(() => service().open(file))).toBe("project.invalid");
    expect(statSync(file).size).toBe(0);

    const emptyDb = join(dir, "empty.marktwain");
    openDatabase(emptyDb).close();
    const before = statSync(emptyDb).size;
    expect(codeOf(() => service().open(emptyDb))).toBe("project.invalid");
    expect(statSync(emptyDb).size).toBe(before);
    // Again, it is refused the same way and not for a different reason the second time
    expect(codeOf(() => service().open(emptyDb))).toBe("project.invalid");
  });
});
