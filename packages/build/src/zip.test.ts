import { describe, expect, it } from "@jest/globals";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yauzl from "yauzl";
import { zipFolder } from "./zip";

/** The names in a zip, with the size of each file. */
function entries(zipPath: string): Promise<Record<string, number>> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(error);
      const found: Record<string, number> = {};
      zip.on("entry", (entry: yauzl.Entry) => {
        found[entry.fileName] = entry.uncompressedSize;
        zip.readEntry();
      });
      zip.on("end", () => resolve(found));
      zip.on("error", reject);
      zip.readEntry();
    });
  });
}

describe("zipFolder", () => {
  it("packs every file under one folder with forward slashes and keeps non-ASCII names", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain zip 壓縮 "));
    try {
      const source = join(work, "src");
      mkdirSync(join(source, "contents/front"), { recursive: true });
      writeFileSync(join(source, "main.typ"), "hello");
      writeFileSync(join(source, "contents/front/摘要.typ"), "摘要");
      const target = join(work, "out.zip");
      await zipFolder(source, target, "我的論文-typst");
      expect(await entries(target)).toEqual({
        "我的論文-typst/contents/front/摘要.typ": 6,
        "我的論文-typst/main.typ": 5,
      });
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it("packs an empty folder into a valid zip", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain zip "));
    try {
      mkdirSync(join(work, "empty"));
      await zipFolder(join(work, "empty"), join(work, "e.zip"), "x");
      expect(existsSync(join(work, "e.zip"))).toBe(true);
      expect(await entries(join(work, "e.zip"))).toEqual({});
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
