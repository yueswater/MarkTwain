import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildTypst } from "./build-typst";
import { renderThumbnail } from "./thumbnail";
import { decodeGray, verticalLines } from "./test-png";
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

/** The packages the template imports, fetched by pnpm typst:fetch. */
const packageCachePath = process.env.MARKTWAIN_TYPST_PACKAGES || resolve(__dirname, "../../../resources/typst-packages");
const hasPackages = ["kouhu/0.2.0", "ipsum/0.1.0"].every((name) => existsSync(join(packageCachePath, "preview", name)));

/**
 * Environment that hides every cache of the user and cuts the network.
 * Where typst keeps downloaded packages differs by system, so all of them point to the empty folder.
 * The dead proxy makes a download fail at once instead of quietly succeeding.
 */
function offlineEnv(home: string): Record<string, string> {
  const dead = "http://127.0.0.1:9";
  return {
    HOME: home,
    USERPROFILE: home,
    XDG_CACHE_HOME: join(home, "cache"),
    XDG_DATA_HOME: join(home, "data"),
    LOCALAPPDATA: join(home, "local"),
    APPDATA: join(home, "roaming"),
    HTTP_PROXY: dead,
    HTTPS_PROXY: dead,
    ALL_PROXY: dead,
  };
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

  it("builds the blocks of a mathematical thesis with a name of the author", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 定理 "));
    try {
      const result = await buildTypst(
        input(work, {
          config: `${config}statements:\n  name:\n    lemma: "引裡"\n`,
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

  it("floats figures and tables where they ask to, and follows the default of the thesis", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 浮動 "));
    try {
      const result = await buildTypst(
        input(work, {
          config: `${config}placement:\n  figure: auto\n  table: bottom\n`,
          documents: [
            {
              id: "c1",
              kind: "chapter",
              text: [
                "# 緒論",
                "",
                "![頂端](images/a.png){#fig:a placement=top}",
                "",
                "![預設](images/a.png){#fig:b}",
                "",
                "![固定](images/a.png){#fig:c placement=here}",
                "",
                "| 甲 | 乙 |",
                "|:--|--:|",
                "| 1 | 2 |",
                "",
                ": 表一 {#tbl:t placement=top}",
                "",
                "| 甲 | 乙 |",
                "|:--|--:|",
                "| 1 | 2 |",
                "",
                ": 表二 {#tbl:u style=grid}",
                "",
                "見 @fig:a 與 @tbl:t。",
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

  it("builds tables whose lines the author chose, diagonals and merged cells included", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 框線 "));
    try {
      const result = await buildTypst(
        input(work, {
          documents: [
            {
              id: "c1",
              kind: "chapter",
              text: [
                "# 緒論",
                "",
                "| 甲＼乙 | 左 | 右 |",
                "|---|---|---|",
                "| 上 | 3,1 | 0,0 |",
                "| 下 | 1,1 | 2,3 |",
                "",
                ": 報酬矩陣 {#tbl:a borders=\"h0.*=none;h-1.*=none;h1.1-2=1.5;v1.0-1=1/dashed/#ff0000;dd0.0=0.5;du1.2=0.75\"}",
                "",
                "| a | b | c |",
                "|---|---|---|",
                "| 1 |  | 3 |",
                "| 4 | 5 | 6 |",
                "",
                ": 合併 {#tbl:b cells=\"2.2:colspan=2\" borders=\"h2.*=2.25;v1.*=0.5/dotted\"}",
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

  it("draws the columns of a table in the shares that its widths say", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 欄寬 "));
    try {
      const result = await buildTypst({
        ...input(work, {
          documents: [
            {
              id: "c1",
              kind: "chapter",
              text: ["# 表", "", "| 甲 | 乙 | 丙 |", "|---|---|---|", "| 1 | 2 | 3 |", "| 4 | 5 | 6 |", "", ": 欄寬 {#tbl:w style=grid widths=\"20%,30%,50%\"}"].join("\n"),
            },
          ],
        }),
        format: "png",
        ppi: 110,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const lines = verticalLines(decodeGray(result.pages.at(-1) as Uint8Array), 60);
      expect(lines).toHaveLength(4);
      const total = (lines[3] as number) - (lines[0] as number);
      const shares = [1, 2, 3].map((i) => ((lines[i] as number) - (lines[i - 1] as number)) / total);
      expect(shares[0]).toBeCloseTo(0.2, 1);
      expect(shares[1]).toBeCloseTo(0.3, 1);
      expect(shares[2]).toBeCloseTo(0.5, 1);
      // The table is as wide as the text, 21 cm paper with 3 cm margins is 15 cm of 21
      expect(total / decodeGray(result.pages.at(-1) as Uint8Array).width).toBeCloseTo(15 / 21, 1);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("draws a table at the share of the text width that it asks for, with a reference that still resolves", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 表寬 "));
    try {
      const result = await buildTypst({
        ...input(work, {
          documents: [
            {
              id: "c1",
              kind: "chapter",
              text: ["# 表", "", "見 @tbl:w。", "", "| 甲 | 乙 | 丙 |", "|---|---|---|", "| 1 | 2 | 3 |", "| 4 | 5 | 6 |", "| 7 | 8 | 9 |", "", ": 窄表 {#tbl:w style=grid width=60% size=80%}"].join("\n"),
            },
          ],
        }),
        format: "png",
        ppi: 110,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const page = decodeGray(result.pages.at(-1) as Uint8Array);
      const lines = verticalLines(page, 40);
      expect(lines).toHaveLength(4);
      // 60% of the 15 cm text width is 9 cm of the 21 cm paper
      expect(((lines[3] as number) - (lines[0] as number)) / page.width).toBeCloseTo((15 * 0.6) / 21, 1);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("writes the numbers of every list style as the editor does, well past ten", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 清單數字 "));
    try {
      const { ORDERED_STYLES, formatOrdered } = await import("@marktwain/schema");
      const { run } = await import("./build-typst");
      const { writeFileSync } = await import("node:fs");
      const numbers = Array.from({ length: 130 }, (_, i) => i + 1);
      for (const style of ORDERED_STYLES) {
        writeFileSync(join(work, "n.typ"), `#metadata(range(1, 131).map(n => numbering("${style.pattern}", n))) <out>\n`);
        const out = await new Promise<string>((resolve, reject) => {
          void run(typst as string, ["query", "n.typ", "<out>", "--field", "value", "--one"], work, 60_000).then((r) => (r.code === 0 ? resolve(r.stdout) : reject(new Error(r.stderr))));
        });
        const fromTypst = JSON.parse(out) as string[];
        // Typst writes a number it cannot express in the style as a plain number, the editor does the same
        expect(numbers.map((n) => formatOrdered(style.id, n)).map((text, i) => [i + 1, text])).toEqual(fromTypst.map((text, i) => [i + 1, text]));
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("builds nested lists with the markers of each level", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 清單 "));
    try {
      const result = await buildTypst(
        input(work, {
          config: `${config}lists:\n  ordered: [cjk, cjk-paren, decimal]\n  bullet: [diamond, circle, dash]\n`,
          documents: [
            {
              id: "c1",
              kind: "chapter",
              text: ["# 緒論", "", "1. 第一點", "   1. 細項", "      - 符號", "         - 再下一層", "2. 第二點", "", "5. 從五開始", "", "- 甲", "  - 乙", "    - 丙", "      - 丁"].join("\n"),
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

  it("draws the payoff matrix with lines only around the payoffs, as a game theory text does", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 報酬 "));
    try {
      const { buildTable, loadLibrary } = await import("@marktwain/table-templates");
      const template = loadLibrary(resolve(__dirname, "../../../resources/table-templates")).fields.flatMap((field) => field.templates).find((t) => t.id === "payoff-matrix")!;
      const result = await buildTypst({
        ...input(work, { documents: [{ id: "c1", kind: "chapter", text: `# 表\n\n${buildTable(template, "en", { rows: 2, columns: 2 })}` }] }),
        format: "png",
        ppi: 110,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const page = decodeGray(result.pages.at(-1) as Uint8Array);
      // Two columns of payoffs have three vertical lines, and nothing is drawn at the left of the names
      expect(verticalLines(page, 20)).toHaveLength(3);
      if (process.env.MARKTWAIN_DUMP_PAYOFF) writeFileSync(process.env.MARKTWAIN_DUMP_PAYOFF, result.pages.at(-1) as Uint8Array);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("builds every table template, at its defaults and at the limits of its parameters, in both languages", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 範本 "));
    try {
      const { buildTable, loadLibrary } = await import("@marktwain/table-templates");
      const library = loadLibrary(resolve(__dirname, "../../../resources/table-templates"));
      const templates = library.fields.flatMap((field) => field.templates);
      const tables: string[] = [];
      let n = 0;
      for (const language of ["zh-Hant", "en"] as const) {
        for (const template of templates) {
          const max = Object.fromEntries(Object.entries(template.params).map(([name, p]) => [name, p.type === "int" ? p.max : true]));
          const min = Object.fromEntries(Object.entries(template.params).map(([name, p]) => [name, p.type === "int" ? p.min : false]));
          for (const given of [{}, max, min]) {
            n += 1;
            // Every table gets a label of its own so that no two are the same
            const lines = buildTable(template, language, given).trimEnd().split("\n");
            const caption = lines.pop() as string;
            tables.push([...lines, caption.endsWith("}") ? caption.replace(" {", ` {#tbl:t${n} `) : `${caption} {#tbl:t${n}}`].join("\n"));
          }
        }
      }
      const result = await buildTypst(
        input(work, { documents: [{ id: "c1", kind: "chapter", text: ["# 範本", "", ...tables.flatMap((table) => [table, ""])].join("\n") }] }),
      );
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(result.ok).toBe(true);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 240_000);

  it("turns the pages of a landscape block sideways and leaves the others upright", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 橫向 "));
    try {
      const result = await buildTypst({
        ...input(work, {
          documents: [
            {
              id: "c1",
              kind: "chapter",
              text: ["# 緒論", "", "直向的內文。", "", "::: landscape", "| 甲 | 乙 | 丙 |", "|---|---|---|", "| 1 | 2 | 3 |", "", ": 寬表 {#tbl:wide}", ":::", "", "又回到直向。"].join("\n"),
            },
          ],
        }),
        format: "png",
        ppi: 20,
      });
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // The pages come as pictures, so the turned ones are the ones that are wider than tall
      const shapes = result.pages.map((page) => decodeGray(page)).map((image) => image.width > image.height);
      expect(shapes.some((landscape) => landscape)).toBe(true);
      expect(shapes.some((landscape) => !landscape)).toBe(true);
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

  it("returns the error and leaves nothing behind when the build fails while the anchors are being read", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 錯誤 "));
    try {
      // The query for the anchors runs beside the compile and fails too, so it is still running when the compile has returned
      for (let round = 0; round < 3; round += 1) {
        const result = await buildTypst({
          ...input(work, { documents: [{ id: "c1", kind: "chapter", text: "# 標題\n\n![缺圖](images/missing.png)\n" }] }),
          anchors: true,
        });
        expect(result.ok).toBe(false);
        expect(result.diagnostics.some((d) => d.severity === "error")).toBe(true);
        expect(readdirSync(work)).toEqual([]);
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 180_000);

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

  (hasPackages ? it : it.skip)("builds offline with the bundled packages and an empty cache of the user", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 離線 "));
    const home = mkdtempSync(join(tmpdir(), "marktwain home "));
    try {
      const result = await buildTypst(
        input(work, { packageCachePath, env: offlineEnv(home), anchors: true, documents: [{ id: "c1", kind: "chapter", text: "# 標題\n\n內容。\n" }] }),
      );
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(result.ok).toBe(true);
      // The anchors come from typst query or eval, which need the packages as well.
      if (result.ok) expect(result.anchors.length).toBeGreaterThan(0);
      // Nothing was downloaded into the cache of the user.
      expect(readdirSync(home)).toEqual([]);
    } finally {
      rmSync(work, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  }, 120_000);

  it("fails without the packages when the cache of the user is empty and there is no network", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 缺套件 "));
    const home = mkdtempSync(join(tmpdir(), "marktwain home "));
    const empty = mkdtempSync(join(tmpdir(), "marktwain packages "));
    try {
      const result = await buildTypst(
        input(work, { packageCachePath: empty, env: offlineEnv(home), documents: [{ id: "c1", kind: "chapter", text: "# 標題\n\n內容。\n" }] }),
      );
      expect(result.ok).toBe(false);
      expect(result.diagnostics.some((d) => /failed to download package/.test(d.message))).toBe(true);
    } finally {
      rmSync(work, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
      rmSync(empty, { recursive: true, force: true });
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
