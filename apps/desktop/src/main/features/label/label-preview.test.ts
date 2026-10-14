import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "@marktwain/schema";
import { findPreview, plainCaption } from "./label-preview";

const blocks = (md: string) => parseMarkdown(md).content as Parameters<typeof findPreview>[0];

describe("findPreview", () => {
  it("shows a figure with its caption in plain text", () => {
    expect(findPreview(blocks("![**圖** $x$](images/a.png){#fig:a}\n"), "fig:a")).toEqual({ block: 0, content: { type: "figure", src: "images/a.png", caption: "圖 x" } });
  });

  it("shows the first rows of a table and says when there are more", () => {
    const rows = Array.from({ length: 9 }, (_, i) => `| ${i} | v${i} |`).join("\n");
    const preview = findPreview(blocks(`| a | b |\n|---|---|\n${rows}\n\n: 表題 {#tbl:t}\n`), "tbl:t");
    expect(preview?.content).toMatchObject({ type: "table", caption: "表題", more: true });
    expect(preview?.content.type === "table" ? preview.content.rows : []).toHaveLength(6);
  });

  it("shows a formula, a code block and a heading with the start of its text", () => {
    expect(findPreview(blocks("$$\nx^2\n$$ {#eq:e}\n"), "eq:e")).toEqual({ block: 0, content: { type: "formula", latex: "x^2" } });
    const code = findPreview(blocks("```python {#lst:c caption=\"範例\"}\n" + Array.from({ length: 12 }, (_, i) => `line${i}`).join("\n") + "\n```\n"), "lst:c");
    expect(code?.content).toMatchObject({ type: "code", more: true, language: "python", caption: "範例" });
    expect(findPreview(blocks("## 動機 {#sec:why}\n\n第一段文字。\n"), "sec:why")).toEqual({ block: 0, content: { type: "heading", title: "動機", excerpt: "第一段文字。" } });
  });

  it("returns null for a label that does not exist", () => {
    expect(findPreview(blocks("文字\n"), "fig:none")).toBeNull();
  });
});

describe("plainCaption", () => {
  it("takes marks and dollar signs away", () => {
    expect(plainCaption("**粗** `code` $y$  多  空白")).toBe("粗 code y 多 空白");
  });
});
