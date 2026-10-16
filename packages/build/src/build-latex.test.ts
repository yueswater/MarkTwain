import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { buildLatex, latexWorkDir, texEnvironment } from "./build-latex";
import { PNG, SAMPLE_CONFIG, SAMPLE_DOCUMENTS } from "./fixtures";
import type { LatexBuildInput } from "./build-latex";

const templateDir = resolve(__dirname, "../../../resources/templates/tex");

/** The folder of the TeX binaries, from the environment or from where xelatex is on the PATH. */
function findTexBin(): string | null {
  const configured = process.env.MARKTWAIN_TEX_BIN;
  if (configured) return configured;
  try {
    const found = execFileSync(process.platform === "win32" ? "where" : "which", ["xelatex"], { encoding: "utf8" }).split(/\r?\n/)[0];
    return found ? dirname(found) : null;
  } catch {
    return null;
  }
}

const texBin = findTexBin();
const available = texBin !== null && existsSync(templateDir);
const maybe = available ? describe : describe.skip;

describe("latexWorkDir", () => {
  it("keeps a work folder that is ASCII and any folder outside Windows", () => {
    expect(latexWorkDir("/tmp/中文", "linux")).toBe("/tmp/中文");
    expect(latexWorkDir("C:\\Users\\me\\Temp", "win32")).toBe("C:\\Users\\me\\Temp");
  });
});

describe("texEnvironment", () => {
  it("puts the folder of the binaries first on the PATH, whatever the variable is called", () => {
    expect(texEnvironment("/tex/bin", { PATH: "/usr/bin" })).toEqual({ PATH: `/tex/bin${delimiter}/usr/bin` });
    expect(texEnvironment("C:\\tex", { Path: "C:\\win" })).toEqual({ Path: `C:\\tex${delimiter}C:\\win` });
    expect(texEnvironment(null, { PATH: "/usr/bin" })).toEqual({});
  });
});

maybe("buildLatex", () => {
  const base = (): LatexBuildInput => ({
    templateDir,
    workDir: mkdtempSync(join(tmpdir(), "marktwain 論文 ")),
    texBin,
    config: SAMPLE_CONFIG,
    documents: SAMPLE_DOCUMENTS,
    files: [{ path: "images/a.png", data: PNG }],
    bibliography: [],
  });

  it("builds the sample thesis to a PDF", async () => {
    const input = base();
    try {
      const result = await buildLatex(input);
      if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.severity} ${d.file}:${d.line} ${d.message}`).join("\n"));
      expect(Buffer.from(result.pdf.subarray(0, 5)).toString()).toBe("%PDF-");
      expect(result.mathFailures).toEqual([]);
    } finally {
      rmSync(input.workDir, { recursive: true, force: true });
    }
  }, 300_000);

  it("builds with an image that is missing, shows a grey box and names the block", async () => {
    const input: LatexBuildInput = { ...base(), documents: [{ id: "c1", kind: "chapter", text: "# 緒論\n\n![缺圖](images/missing.png)\n" }], files: [] };
    try {
      const result = await buildLatex(input);
      if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join("\n"));
      expect(result.diagnostics.filter((d) => d.code === "image-missing").map((d) => d.source)).toEqual([{ documentId: "c1", block: 1 }]);
    } finally {
      rmSync(input.workDir, { recursive: true, force: true });
    }
  }, 300_000);

  it("builds a table of many rows so that it runs over pages and the header comes again", async () => {
    const rows = Array.from({ length: 70 }, (_, i) => `| 列${i + 1} | ${i * 3} |`).join("\n");
    const input: LatexBuildInput = {
      ...base(),
      documents: [{ id: "c1", kind: "chapter", text: `# 表\n\n| 名稱 | 數值 |\n|:--|--:|\n${rows}\n\n: 很長的表 {#tbl:long notes="資料來源：測試"}\n` }],
      files: [],
    };
    try {
      const result = await buildLatex(input);
      if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join("\n"));
      // The table is longer than a page, the line "Infinite glue shrinkage" or a row cut off the page was what a table in one piece gave
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    } finally {
      rmSync(input.workDir, { recursive: true, force: true });
    }
  }, 300_000);

  it("builds a heading that holds a footnote, with the heading in the table of contents without it", async () => {
    const input: LatexBuildInput = {
      ...base(),
      documents: [{ id: "c1", kind: "chapter", text: "# 緒論\n\n## 腳註在標題中[^1]\n\n內文。\n\n[^1]: 這是註。\n" }],
      files: [],
    };
    try {
      const result = await buildLatex(input);
      if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.severity} ${d.message}`).join("\n"));
      expect(Buffer.from(result.pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    } finally {
      rmSync(input.workDir, { recursive: true, force: true });
    }
  }, 300_000);

  it("resolves the citations in a final copy with the watermark, and draws the watermark of the school", async () => {
    const bib = new TextEncoder().encode("@article{wang2020, author={Wang, A. and Lee, B.}, title={Deep things}, journal={J. Stuff}, year={2020}}\n");
    const make = (watermark: boolean): LatexBuildInput => ({
      ...base(),
      config: `${SAMPLE_CONFIG}\nschool: ntu\nbibliography:\n  path: ["/contents/back/refs.bib"]\n`,
      documents: [{ id: "c1", kind: "chapter", text: "# 緒論\n\n引用 [@wang2020]。\n" }],
      files: [],
      bibliography: [{ path: "refs.bib", data: bib }],
      watermark,
    });
    const draft = make(false);
    const final = make(true);
    try {
      const a = await buildLatex(draft);
      const b = await buildLatex(final);
      if (!a.ok || !b.ok) throw new Error([a, b].flatMap((r) => r.diagnostics).map((d) => `${d.severity} ${d.message}`).join("\n"));
      // An unresolved citation is reported by the log, the latexmk option -usepretex used to leave it so
      expect(b.diagnostics.filter((d) => /undefined citation/.test(d.message))).toEqual([]);
      expect(a.diagnostics.filter((d) => /undefined citation/.test(d.message))).toEqual([]);
      expect(b.pdf.length).toBeGreaterThan(a.pdf.length);
    } finally {
      rmSync(draft.workDir, { recursive: true, force: true });
      rmSync(final.workDir, { recursive: true, force: true });
    }
  }, 600_000);
});
