import { describe, expect, it } from "@jest/globals";
import { parseMarkdown, serializeMarkdown } from "@marktwain/schema";
import { findUnlabeledBlocks, kindAt, labelAt, labelsIn, withLabel } from "./label-unlabeled";

type Blocks = Parameters<typeof findUnlabeledBlocks>[0];
const blocks = (md: string) => (parseMarkdown(md).content ?? []) as Blocks;

const SOURCE = [
  "# 緒論",
  "",
  "## 動機 {#sec:why}",
  "",
  "## 方法",
  "",
  "![架構圖](a.png)",
  "",
  "![](b.png)",
  "",
  "| a |",
  "|---|",
  "| 1 |",
  "",
  ": 結果表",
  "",
  "$$",
  "x^2",
  "$$",
  "",
  "::: {.theorem}",
  "內容",
  ":::",
  "",
  "::: {.proof}",
  "證明",
  ":::",
].join("\n");

describe("findUnlabeledBlocks", () => {
  it("lists what can be referenced and has no label, and leaves out the labeled, the bare and the proofs", () => {
    const found = findUnlabeledBlocks(blocks(SOURCE));
    expect(found.map((item) => [item.kind, item.text])).toEqual([
      ["cha", "緒論"],
      ["sec", "方法"],
      ["fig", "架構圖"],
      ["tbl", "結果表"],
      ["eq", "x^2"],
      ["thm", "內容"],
    ]);
  });
});

describe("withLabel", () => {
  it("writes the label of a heading and survives a trip through Markdown", () => {
    const list = blocks(SOURCE);
    const index = findUnlabeledBlocks(list).find((item) => item.kind === "sec")!.block;
    const next = withLabel(list, index, "sec:abcd");
    expect(labelAt(next, index)).toBe("sec:abcd");
    expect(labelAt(list, index)).toBe("");
    const text = serializeMarkdown({ type: "doc", content: next } as Parameters<typeof serializeMarkdown>[0]);
    expect(text).toContain("## 方法 {#sec:abcd}");
    expect(findUnlabeledBlocks(blocks(text)).some((item) => item.kind === "sec")).toBe(false);
  });

  it("keeps the label of a block of a mathematical thesis in its id", () => {
    const list = blocks(SOURCE);
    const index = findUnlabeledBlocks(list).find((item) => item.kind === "thm")!.block;
    const text = serializeMarkdown({ type: "doc", content: withLabel(list, index, "thm:abcd") } as Parameters<typeof serializeMarkdown>[0]);
    expect(text).toContain("#thm:abcd");
    expect(labelsIn(blocks(text))).toContain("thm:abcd");
  });
});

describe("kindAt", () => {
  it("is null for a block that is gone or cannot be referenced", () => {
    const list = blocks(SOURCE);
    expect(kindAt(list, 99)).toBeNull();
    expect(kindAt(list, 0)).toBe("cha");
  });
});
