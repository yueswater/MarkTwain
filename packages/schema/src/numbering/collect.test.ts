import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "../markdown/parse";
import { collectCitations, collectTargets } from "./collect";
import { resolveNumbers } from "./numbering";

const collect = (md: string, scope = "d1") => collectTargets(parseMarkdown(md), scope);

describe("collectTargets", () => {
  it("章節標題只在有標籤時成為目標，文字取純文字", () => {
    const { targets } = collect("# 緒論 {#cha:intro}\n\n## **研究**動機 {#sec:why}\n\n## 沒有標籤\n");
    expect(targets).toEqual([
      { kind: "cha", label: "cha:intro", text: "緒論" },
      { kind: "sec", label: "sec:why", text: "研究動機" },
    ]);
  });

  it("標籤前綴不是 cha 或 sec 的標題不是目標", () => {
    expect(collect("# 標題 {#fig:oops}\n").targets).toEqual([]);
  });

  it("圖、表、公式、程式碼依文件順序，沒有標籤的圖表佔一個編號，沒有標籤的公式不編號", () => {
    const md = [
      "![說明](a.png){#fig:a}",
      "",
      "![沒標籤](b.png)",
      "",
      "$$",
      "x",
      "$$ {#eq:x}",
      "",
      "$$",
      "y",
      "$$",
      "",
      "| a |",
      "|---|",
      "| 1 |",
      "",
      ": 表標題 {#tbl:t}",
    ].join("\n");
    const { targets } = collect(md);
    expect(targets.map((t) => t.kind)).toEqual(["fig", "fig", "eq", "tbl"]);
    expect(targets[0]?.label).toBe("fig:a");
    expect(targets[1]?.label).toMatch(/^fig:~d1~\d+$/);
    expect(targets[2]?.label).toBe("eq:x");
    expect(targets[3]?.label).toBe("tbl:t");
  });

  it("沒有標題也沒有標籤的程式碼區塊不編號，有標題的才算", () => {
    const md = ["```python", "print(1)", "```", "", "```python {caption=\"範例\"}", "print(2)", "```"].join("\n");
    expect(collect(md).targets.map((t) => t.kind)).toEqual(["lst"]);
  });

  it("收集交叉引用，依出現順序可重複", () => {
    const { references } = collect("見 @fig:a 與 @eq:x，再見 @fig:a。\n");
    expect(references).toEqual(["fig:a", "eq:x", "fig:a"]);
  });

  it("不同文件的合成標籤互不衝突，編號接續", () => {
    const a = collect("![x](a.png)\n", "A");
    const b = collect("![y](b.png)\n", "B");
    const result = resolveNumbers([...a.targets, ...b.targets], [], {
      equationNumbering: "all",
      numberPerChapter: false,
    });
    expect([...result.numbers.values()]).toEqual(["1", "2"]);
    expect(result.duplicates).toEqual([]);
  });
});

describe("captions decide numbering", () => {
  it("figures and tables without a caption get no number", () => {
    const md = ["![](a.png)", "", "![有說明](b.png)", "", "| a |", "| --- |", "", "| c |", "| --- |", "", ": 表標題"].join("\n");
    expect(collect(md).targets.map((t) => t.kind)).toEqual(["fig", "tbl"]);
  });
});

describe("collectCitations", () => {
  it("lists cited keys in order, also inside headings and lists", () => {
    const md = "# 標題 [@a]\n\n文字 [@b; @c] 與 @d。\n\n- 項目 [-@a]\n";
    expect(collectCitations(parseMarkdown(md))).toEqual(["a", "b", "c", "d", "a"]);
  });

  it("ignores cross-references and text without citations", () => {
    expect(collectCitations(parseMarkdown("見 @fig:one 與 email a@b.com"))).toEqual([]);
  });
});

describe("公式只有在有標籤時才編號", () => {
  it("沒有標籤的公式不佔編號，後面的公式接續", () => {
    const md = ["$$", "a", "$$", "", "$$", "b", "$$ {#eq:one}", "", "$$", "c", "$$", "", "$$", "d", "$$ {#eq:two}"].join("\n");
    const { targets } = collect(md);
    expect(targets.map((t) => t.label)).toEqual(["eq:one", "eq:two"]);
    const result = resolveNumbers(targets, [], { equationNumbering: "all", numberPerChapter: false });
    expect([...result.numbers.entries()]).toEqual([
      ["eq:one", "1"],
      ["eq:two", "2"],
    ]);
  });
});
