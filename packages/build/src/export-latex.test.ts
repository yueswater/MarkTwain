import { describe, expect, it } from "@jest/globals";
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { exportLatexProject } from "./build-latex";
import { PNG, SAMPLE_CONFIG, SAMPLE_DOCUMENTS } from "./fixtures";

const templateDir = resolve(__dirname, "../../../resources/templates/tex");
const maybe = existsSync(templateDir) ? describe : describe.skip;

maybe("exportLatexProject", () => {
  it("writes a self contained project with the template folders copied, not linked", () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 匯出 "));
    const dest = join(work, "我的論文");
    try {
      exportLatexProject({ templateDir, workDir: work, texBin: null, config: SAMPLE_CONFIG, documents: SAMPLE_DOCUMENTS, files: [{ path: "images/a.png", data: PNG }], bibliography: [] }, dest);
      const entries = readdirSync(dest);
      const missing = ["main.tex", "config.yml", "contents", "figures", "fonts", "scripts", "schools", "tw-thesis.cls", "latexmkrc"].filter((name) => !entries.includes(name));
      expect(missing).toEqual([]);
      for (const name of ["fonts", "scripts", "schools"]) expect(lstatSync(join(dest, name)).isSymbolicLink()).toBe(false);
      expect(readFileSync(join(dest, "main.tex"), "utf8")).toContain("\\input");
      expect(existsSync(join(dest, "scripts/gen.lua"))).toBe(true);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it("refuses a destination that already has files", () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 匯出 "));
    try {
      writeFileSync(join(work, "keep.txt"), "x");
      expect(() => exportLatexProject({ templateDir, workDir: work, texBin: null, config: "", documents: [], files: [], bibliography: [] }, work)).toThrow("not empty");
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
