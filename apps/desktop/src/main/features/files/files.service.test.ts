import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import { AppError } from "../../core/errors";
import { FilesService } from "./files.service";

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "marktwain files "));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof AppError ? e.code : "other";
  }
  return undefined;
}

describe("FilesService.list", () => {
  it("lists the folders first, then the files with the extension, and hides the rest", () => {
    mkdirSync(join(home, "乙資料夾"));
    mkdirSync(join(home, "甲資料夾"));
    mkdirSync(join(home, ".hidden"));
    writeFileSync(join(home, "b.marktwain"), "");
    writeFileSync(join(home, "a.MARKTWAIN"), "");
    writeFileSync(join(home, "notes.txt"), "");
    const listing = new FilesService({ home }).list(home, "marktwain");
    expect(listing.entries.map((entry) => `${entry.kind}:${entry.name}`)).toEqual(["dir:乙資料夾", "dir:甲資料夾", "file:a.MARKTWAIN", "file:b.marktwain"]);
    expect(listing.readable).toBe(true);
    expect(listing.path).toBe(home);
  });

  it("lists only folders when no extension is asked for", () => {
    mkdirSync(join(home, "a"));
    writeFileSync(join(home, "b.marktwain"), "");
    expect(new FilesService({ home }).list(home, null).entries).toEqual([{ name: "a", kind: "dir" }]);
  });

  it("opens on the start folder, then on the documents of the person, then on the home", () => {
    const start = join(home, "start");
    mkdirSync(start);
    expect(new FilesService({ home, start: () => start }).list(null, null).path).toBe(start);
    mkdirSync(join(home, "Documents"));
    expect(new FilesService({ home }).list(null, null).path).toBe(join(home, "Documents"));
    rmSync(join(home, "Documents"), { recursive: true });
    expect(new FilesService({ home }).list(null, null).path).toBe(home);
  });

  it("falls back when the folder is gone, and gives the folder above", () => {
    const service = new FilesService({ home });
    expect(service.list(join(home, "nowhere"), null).path).toBe(home);
    mkdirSync(join(home, "a"));
    expect(service.list(join(home, "a"), null).parent).toBe(home);
  });

  it("offers the places that exist", () => {
    mkdirSync(join(home, "Desktop"));
    const ids = new FilesService({ home, platform: "linux" }).list(home, null).places.map((place) => place.id);
    expect(ids).toEqual(["home", "desktop"]);
  });
});

describe("FilesService.makeFolder", () => {
  it("makes the folder and returns its path", () => {
    expect(new FilesService({ home }).makeFolder(home, " 論文 ")).toBe(join(home, "論文"));
  });

  it("refuses a name that is empty or has a character that file systems refuse", () => {
    const service = new FilesService({ home });
    expect(codeOf(() => service.makeFolder(home, "  "))).toBe(ErrorCode.FilesInvalidName);
    expect(codeOf(() => service.makeFolder(home, "a/b"))).toBe(ErrorCode.FilesInvalidName);
    expect(codeOf(() => service.makeFolder(home, ".."))).toBe(ErrorCode.FilesInvalidName);
  });

  it("refuses a name that is taken", () => {
    const service = new FilesService({ home });
    service.makeFolder(home, "a");
    expect(codeOf(() => service.makeFolder(home, "a"))).toBe(ErrorCode.FilesFolderExists);
  });
});
