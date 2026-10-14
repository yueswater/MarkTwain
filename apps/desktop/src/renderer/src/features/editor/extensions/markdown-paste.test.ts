import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { createSchemaExtensions } from "./schema-extensions";
import { looksLikeMarkdown, markdownToSlice } from "./markdown-paste";

const schema = getSchema(createSchemaExtensions());

describe("looksLikeMarkdown", () => {
  it("標題、清單、表格、圍欄、公式等區塊標記", () => {
    for (const text of [
      "# 標題",
      "前文\n\n- 一\n- 二",
      "1. 甲\n2. 乙",
      "> 引言",
      "```js\nx\n```",
      "| a | b |\n|---|---|\n| 1 | 2 |",
      "$$\nx\n$$",
      "![圖](a.png)",
    ]) {
      expect(looksLikeMarkdown(text)).toBe(true);
    }
  });

  it("明確的行內標記", () => {
    expect(looksLikeMarkdown("這是**重點**")).toBe(true);
    expect(looksLikeMarkdown("用 `npm` 安裝")).toBe(true);
    expect(looksLikeMarkdown("設 $x^2$ 為")).toBe(true);
    expect(looksLikeMarkdown("見[@wang2020]")).toBe(true);
  });

  it("一般文字與貨幣不誤判", () => {
    expect(looksLikeMarkdown("今天天氣很好。")).toBe(false);
    expect(looksLikeMarkdown("價格 $5 與 $6 之間")).toBe(false);
    expect(looksLikeMarkdown("a - b 是減法")).toBe(false);
    expect(looksLikeMarkdown("")).toBe(false);
  });
});

describe("markdownToSlice", () => {
  it("多個區塊貼成區塊", () => {
    const slice = markdownToSlice(schema, "# 標題\n\n- 一\n- 二\n");
    expect(slice.openStart).toBe(0);
    expect(slice.content.child(0).type.name).toBe("heading");
    expect(slice.content.child(1).type.name).toBe("bulletList");
  });

  it("單一段落開放兩端，文字接在游標處", () => {
    const slice = markdownToSlice(schema, "這是**重點**");
    expect(slice.openStart).toBe(1);
    expect(slice.openEnd).toBe(1);
    expect(slice.content.firstChild?.textContent).toBe("這是重點");
  });
});
