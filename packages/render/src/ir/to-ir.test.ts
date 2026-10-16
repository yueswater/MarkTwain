import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "@marktwain/schema";
import { toIr } from "./to-ir";

const convert = (md: string, labels: string[] = []) =>
  toIr(parseMarkdown(md), { documentId: "d1", knownLabels: new Set(labels) });

describe("toIr：行內", () => {
  it("粗體、斜體、刪除線、連結、行內程式碼", () => {
    const { document } = convert("a **b** *c* ~~d~~ [e](https://x.y) `f`\n");
    const content = (document.blocks[0] as { content: unknown[] }).content;
    expect(content).toEqual([
      { type: "text", text: "a ", marks: [], link: null },
      { type: "text", text: "b", marks: ["bold"], link: null },
      { type: "text", text: " ", marks: [], link: null },
      { type: "text", text: "c", marks: ["italic"], link: null },
      { type: "text", text: " ", marks: [], link: null },
      { type: "text", text: "d", marks: ["strike"], link: null },
      { type: "text", text: " ", marks: [], link: null },
      { type: "text", text: "e", marks: [], link: "https://x.y" },
      { type: "text", text: " ", marks: [], link: null },
      { type: "code", text: "f" },
    ]);
  });

  it("腳註內容解析成行內節點，引用保留 key 與形式", () => {
    const { document } = convert("文字[^1] [@a; @b]\n\n[^1]: 註 **粗**\n");
    const content = (document.blocks[0] as { content: { type: string }[] }).content;
    const footnote = content.find((n) => n.type === "footnote") as unknown as { content: { marks: string[] }[] };
    expect(footnote.content.some((n) => n.marks?.includes("bold"))).toBe(true);
    expect(content.find((n) => n.type === "citation")).toEqual({
      type: "citation",
      keys: ["a", "b"],
      form: "paren",
    });
  });

  it("交叉引用：目標存在時帶種類，不存在時退回純文字並列入問題", () => {
    const { document, issues } = convert("見 @fig:a 與 @fig:gone。\n", ["fig:a"]);
    const content = (document.blocks[0] as { content: { type: string; text?: string; kind?: string }[] }).content;
    expect(content.some((n) => n.type === "ref" && n.kind === "fig")).toBe(true);
    expect(content.some((n) => n.type === "text" && n.text === "fig:gone")).toBe(true);
    expect(issues).toEqual([{ code: "broken-ref", documentId: "d1", block: 0, detail: "fig:gone" }]);
  });
});

describe("toIr：區塊", () => {
  it("標題、清單、引言、程式碼、分隔線、公式", () => {
    const md = [
      "## 小節 {#sec:a}",
      "",
      "- 一",
      "- 二",
      "",
      "3. 三",
      "",
      "> 引言",
      "",
      "```python {#lst:x caption=\"範例\"}",
      "print(1)",
      "```",
      "",
      "---",
      "",
      "$$",
      "x^2",
      "$$ {#eq:e}",
    ].join("\n");
    const types = convert(md).document.blocks.map((b) => b.type);
    expect(types).toEqual(["heading", "list", "list", "quote", "code", "rule", "math"]);
    const [heading, , ordered, , code, , math] = convert(md).document.blocks as any[];
    expect(heading).toMatchObject({ level: 2, label: "sec:a" });
    expect(ordered).toMatchObject({ ordered: true, start: 3 });
    expect(code).toMatchObject({ language: "python", label: "lst:x", text: "print(1)" });
    expect(code.caption).toHaveLength(1);
    expect(math).toMatchObject({ latex: "x^2", label: "eq:e" });
  });

  it("圖、並排圖、表格（表頭、對齊、標題、附註）", () => {
    const md = [
      "![說明](images/a.png){#fig:a width=60%}",
      "",
      "| 甲 | 乙 |",
      "|:--|--:|",
      "| 1 | 2 |",
      "",
      ": 表標題 {#tbl:t notes=\"資料來源\"}",
    ].join("\n");
    const [figure, table] = convert(md).document.blocks as any[];
    expect(figure).toMatchObject({ type: "figure", src: "images/a.png", label: "fig:a", width: "60%" });
    expect(table.header.map((c: any) => c.align)).toEqual(["left", "right"]);
    expect(table.rows).toHaveLength(1);
    expect(table).toMatchObject({ label: "tbl:t" });
    expect(table.caption).toHaveLength(1);
    expect(table.notes).toHaveLength(1);
  });

  it("定義清單與 div", () => {
    const md = ["PDF", ": 文件格式", "", "::: {.abstract-zh}", "摘要內容", ":::"].join("\n");
    const [deflist, div] = convert(md).document.blocks as any[];
    expect(deflist.entries[0].descriptions).toHaveLength(1);
    expect(div).toMatchObject({ type: "div", classes: ["abstract-zh"] });
    expect(div.children).toHaveLength(1);
  });

  it("每個頂層區塊保持原本的索引", () => {
    const { document } = convert("一\n\n二\n\n三\n");
    expect(document.blocks).toHaveLength(3);
  });
});

describe("labels that are used twice", () => {
  const md = "![一](a.png){#fig:dup}\n\n![二](a.png){#fig:dup}\n\n見 @fig:dup。\n";

  it("drops the label from the second block and reports it, the first one keeps it", () => {
    const used = new Set<string>();
    const { document, issues } = toIr(parseMarkdown(md), { documentId: "d", knownLabels: new Set(["fig:dup"]), usedLabels: used });
    expect(document.blocks.map((block) => (block.type === "figure" ? block.label : "-"))).toEqual(["fig:dup", null, "-"]);
    expect(issues).toEqual([{ code: "duplicate-label", documentId: "d", block: 1, detail: "fig:dup" }]);
  });

  it("also finds the label that an earlier document uses, and changes nothing without the set", () => {
    const used = new Set(["fig:dup"]);
    const { issues } = toIr(parseMarkdown("![三](a.png){#fig:dup}\n"), { documentId: "e", knownLabels: new Set(["fig:dup"]), usedLabels: used });
    expect(issues.map((i) => i.code)).toEqual(["duplicate-label"]);
    const plain = toIr(parseMarkdown(md), { documentId: "d", knownLabels: new Set(["fig:dup"]) });
    expect(plain.issues).toEqual([]);
  });
});
