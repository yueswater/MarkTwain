import { describe, expect, it } from "@jest/globals";
import { joinBlocks, splitBlocks } from "./blocks";

describe("splitBlocks", () => {
  it("以空行分段", () => {
    expect(splitBlocks("a\n\nb")).toEqual(["a", "b"]);
  });

  it("多個空行視為一個分隔", () => {
    expect(splitBlocks("a\n\n\n\nb")).toEqual(["a", "b"]);
  });

  it("只含空白的行也算空行", () => {
    expect(splitBlocks("a\n  \nb")).toEqual(["a", "b"]);
  });

  it("沒有內容時回傳空陣列", () => {
    expect(splitBlocks("")).toEqual([]);
    expect(splitBlocks("\n \n")).toEqual([]);
  });

  it("圍欄程式碼內的空行不分段", () => {
    expect(splitBlocks("```ts\nx\n\ny\n```\n\nz")).toEqual([
      "```ts\nx\n\ny\n```",
      "z",
    ]);
  });

  it("較長的圍欄不會被較短的圍欄關閉", () => {
    const code = "````\n```\n\n```\n````";
    expect(splitBlocks(`${code}\n\nafter`)).toEqual([code, "after"]);
  });

  it("區塊公式內的空行不分段", () => {
    expect(splitBlocks("$$\na\n\nb\n$$\n\nc")).toEqual(["$$\na\n\nb\n$$", "c"]);
  });

  it("單行的 $$ 公式是一般段落", () => {
    expect(splitBlocks("$$ x $$\n\ny")).toEqual(["$$ x $$", "y"]);
  });

  it("圍欄 div 內的空行不分段，且可巢狀", () => {
    const div = "::: a\n\n::: b\nx\n:::\n\ny\n:::";
    expect(splitBlocks(`${div}\n\nz`)).toEqual([div, "z"]);
  });

  it("未關閉的圍欄把剩餘內容併入同一區塊", () => {
    expect(splitBlocks("```\na\n\nb")).toEqual(["```\na\n\nb"]);
  });

  it("CRLF 視同 LF", () => {
    expect(splitBlocks("a\r\n\r\nb")).toEqual(["a", "b"]);
  });
});

describe("joinBlocks", () => {
  it("以單一空行串接並加上結尾換行", () => {
    expect(joinBlocks(["a", "b"])).toBe("a\n\nb\n");
  });

  it("沒有區塊時回傳空字串", () => {
    expect(joinBlocks([])).toBe("");
  });

  it("splitBlocks 後再 joinBlocks 是冪等的", () => {
    const messy = "a\n\n\n\nb\r\n\r\n```\nx\n\ny\n```\n";
    const once = joinBlocks(splitBlocks(messy));
    expect(joinBlocks(splitBlocks(once))).toBe(once);
  });
});
