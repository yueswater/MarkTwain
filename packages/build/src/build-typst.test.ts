import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildTypst } from "./build-typst";
import { renderThumbnail } from "./thumbnail";
import type { BuildInput } from "./types";

const templateDir = resolve(__dirname, "../../../resources/templates/typ");

function findTypst(): string | null {
  const configured = process.env.MARKTWAIN_TYPST;
  if (configured) return configured;
  try {
    execFileSync("typst", ["--version"], { stdio: "ignore" });
    return "typst";
  } catch {
    return null;
  }
}

const typst = findTypst();
const available = typst !== null && existsSync(templateDir);
const maybe = available ? describe : describe.skip;

import { PNG } from "./fixtures";

const config = 'title: "測試論文"\nauthor: "王小明"\nkeywords: ["甲", "乙"]\nkeywords-en: ["a", "b"]\n';

function input(workDir: string, overrides: Partial<BuildInput>): BuildInput {
  return {
    templateDir,
    workDir,
    typst: typst as string,
    config,
    documents: [],
    files: [{ path: "images/a.png", data: PNG }],
    bibliography: [],
    ...overrides,
  };
}

maybe("buildTypst with the real template", () => {
  it("builds a PDF from every kind of document", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 建置 "));
    try {
      const result = await buildTypst(
        input(work, {
          documents: [
            { id: "k", kind: "acknowledgement", text: "感謝大家。\n" },
            { id: "a", kind: "abstract", text: "::: {.abstract-zh}\n中文摘要。\n:::\n\n::: {.abstract-en}\nEnglish abstract.\n:::\n" },
            { id: "n", kind: "denotation", text: "PDF\n: 文件格式\n\n$E$\n: 能量\n" },
            {
              id: "c1",
              kind: "chapter",
              text: [
                "# 緒論 {#cha:intro}",
                "",
                "這是**重點**，公式 $\\frac{a}{b}$，腳註[^1]，見 @fig:a 與 @tbl:t 與 @eq:e。",
                "",
                "[^1]: 腳註內容",
                "",
                "![架構圖](images/a.png){#fig:a width=60%}",
                "",
                "| 甲 | 乙 |",
                "|:--|--:|",
                "| 1 | 2 |",
                "",
                ": 範例表 {#tbl:t notes=\"資料來源\"}",
                "",
                "$$",
                "\\sum_{i=1}^{n} i",
                "$$ {#eq:e}",
                "",
                "- 項目一",
                "- 項目二",
                "",
                "```python {caption=\"範例\"}",
                "print(1)",
                "```",
              ].join("\n"),
            },
            { id: "c2", kind: "chapter", text: "# 方法\n\n第二章。\n" },
            { id: "x", kind: "appendix", text: "# 附錄\n\n附錄內容。\n" },
          ],
        }),
      );
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(result.ok).toBe(true);
      if (result.ok) expect(Buffer.from(result.pdf.slice(0, 5)).toString()).toBe("%PDF-");
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it.each(["plain", "boxed"])("builds the blocks of a mathematical thesis in the %s look", async (look) => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 定理 "));
    try {
      const result = await buildTypst(
        input(work, {
          config: `${config}statements:\n  look: ${look}\n  accent:\n    lemma: "#FF0000"\n`,
          documents: [
            {
              id: "c1",
              kind: "chapter",
              text: [
                "# 緒論",
                "",
                "::: {.definition #def:a title=\"範數\"}",
                "定義內容 $x$。",
                ":::",
                "",
                "::: {.lemma #lem:ss}",
                "引理內容。",
                ":::",
                "",
                "::: {.proof}",
                "由 @lem:ss 與 @def:a 可得。",
                ":::",
              ].join("\n"),
            },
          ],
        }),
      );
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(result.ok).toBe(true);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("reports a typst error against the source block", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 錯誤 "));
    try {
      const result = await buildTypst(
        input(work, {
          documents: [{ id: "c1", kind: "chapter", text: "# 標題\n\n正常段落。\n\n![缺圖](images/missing.png)\n" }],
        }),
      );
      expect(result.ok).toBe(false);
      const error = result.diagnostics.find((d) => d.severity === "error");
      if (!error?.source) throw new Error(JSON.stringify(result.diagnostics));
      expect(error.source).toEqual({ documentId: "c1", block: 2 });
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("falls back to source text for a formula that does not convert", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 公式 "));
    try {
      const result = await buildTypst(
        input(work, { documents: [{ id: "c1", kind: "chapter", text: "# 標題\n\n壞公式 $\\frac{a$ 仍可編譯。\n" }] }),
      );
      expect(result.ok).toBe(true);
      expect(result.mathFailures).toEqual(["\\frac{a"]);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("renders page images for the preview", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 預覽 "));
    try {
      const result = await buildTypst({
        ...input(work, { documents: [{ id: "c1", kind: "chapter", text: "# 標題\n\n內容。\n" }] }),
        format: "png",
        ppi: 60,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.pages.length).toBeGreaterThan(1);
        expect(Buffer.from(result.pages[0]!.slice(1, 4)).toString()).toBe("PNG");
        expect(result.pdf.length).toBe(0);
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("draws the watermark only when it is asked for, from the school or from a file of the project", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 浮水印 "));
    try {
      const documents = [{ id: "c1", kind: "chapter" as const, text: "# 緒論\n\n內文。\n" }];
      const withSchool = `${config}school: nccu\n`;
      const draft = await buildTypst(input(work, { documents, config: withSchool }));
      const final = await buildTypst(input(work, { documents, config: withSchool, watermark: true }));
      expect(draft.ok && final.ok).toBe(true);
      if (!draft.ok || !final.ok) return;
      expect(final.pdf.length).toBeGreaterThan(draft.pdf.length);

      // A file of the project named in the settings is used, and none turns the watermark off
      const custom = await buildTypst(
        input(work, {
          documents,
          config: `${config}watermark:\n  image: "/assets/watermarks/mine.png"\n`,
          watermark: true,
          watermarkFiles: [{ path: "mine.png", data: PNG }],
        }),
      );
      expect(custom.ok).toBe(true);
      const none = await buildTypst(input(work, { documents, config: `${withSchool}watermark:\n  image: "none"\n`, watermark: true }));
      expect(none.ok).toBe(true);
      if (!none.ok) return;
      expect(none.pdf.length).toBeLessThan(final.pdf.length);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it("makes a thumbnail of a PNG and of a PDF, and gives up on a file that is not an image", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 縮圖 "));
    try {
      const png = await renderThumbnail({ typst: typst as string, workDir: work, name: "a.png", data: PNG });
      expect(png).not.toBeNull();
      expect(Buffer.from(png as Uint8Array).subarray(1, 4).toString()).toBe("PNG");
      const pdf = await renderThumbnail({ typst: typst as string, workDir: work, name: "nccu.pdf", data: readFileSync(join(templateDir, "assets/watermarks/nccu.pdf")) });
      expect(pdf).not.toBeNull();
      expect(await renderThumbnail({ typst: typst as string, workDir: work, name: "bad.png", data: new Uint8Array([1, 2, 3]) })).toBeNull();
      expect(await renderThumbnail({ typst: typst as string, workDir: work, name: "../x.png", data: PNG })).toBeNull();
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
