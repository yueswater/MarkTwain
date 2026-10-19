import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backUpProject, createBackupPath, pruneBackups } from "./backup.helper";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "marktwain-backup "));
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("createBackupPath", () => {
  it("在原檔名後加上 .bak- 與檔案的 schema 版本", () => {
    expect(createBackupPath("/x/論文 a.marktwain", 3)).toBe("/x/論文 a.marktwain.bak-3");
  });
});

describe("backUpProject", () => {
  it("複製專案檔，內容相同", () => {
    const file = join(dir, "a.marktwain");
    writeFileSync(file, "project bytes");
    const { backup } = backUpProject(file, 2);
    expect(backup).toBe(`${file}.bak-2`);
    expect(readFileSync(backup, "utf8")).toBe("project bytes");
  });

  it("同版本的舊備份被新的蓋過", () => {
    const file = join(dir, "a.marktwain");
    writeFileSync(file, "old");
    backUpProject(file, 2);
    writeFileSync(file, "new");
    backUpProject(file, 2);
    expect(readFileSync(`${file}.bak-2`, "utf8")).toBe("new");
  });
});

describe("pruneBackups", () => {
  it("只留下版本最新的幾份，並回報刪掉的檔名", () => {
    const file = join(dir, "a.marktwain");
    writeFileSync(file, "x");
    for (const v of [1, 2, 3, 4, 10]) writeFileSync(`${file}.bak-${v}`, "b");
    expect(pruneBackups(file, 3).sort()).toEqual(["a.marktwain.bak-1", "a.marktwain.bak-2"]);
    expect(readdirSync(dir).sort()).toEqual(["a.marktwain", "a.marktwain.bak-10", "a.marktwain.bak-3", "a.marktwain.bak-4"]);
  });

  it("不碰別的專案的備份和不認得的檔名", () => {
    const file = join(dir, "a.marktwain");
    writeFileSync(file, "x");
    writeFileSync(join(dir, "ab.marktwain.bak-1"), "other");
    writeFileSync(`${file}.bak-old`, "legacy");
    writeFileSync(`${file}.bak-20261014-133005`, "legacy");
    expect(pruneBackups(file, 0)).toEqual([]);
    expect(existsSync(join(dir, "ab.marktwain.bak-1"))).toBe(true);
    expect(existsSync(`${file}.bak-old`)).toBe(true);
  });
});
