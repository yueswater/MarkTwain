import { describe, expect, it } from "@jest/globals";
import { escapeText } from "./escape";

const mid = { startOfLine: false, inHeading: false };
const start = { startOfLine: true, inHeading: false };

describe("escapeText：任何位置", () => {
  it("跳脫會被解析成標記或屬性的字元", () => {
    expect(escapeText("a`b*c\\d~e[f]g<h{i}j$k", mid)).toBe("a\\`b\\*c\\\\d\\~e\\[f\\]g\\<h\\{i\\}j\\$k");
  });

  it("底線：字中間的不跳脫，其餘跳脫", () => {
    expect(escapeText("snake_case_name", mid)).toBe("snake_case_name");
    expect(escapeText("_x_ a_ _b", mid)).toBe("\\_x\\_ a\\_ \\_b");
  });

  it("連續的底線每一個都要跳脫（底線本身不算字中間的鄰居）", () => {
    expect(escapeText("a___b", mid)).toBe("a\\_\\_\\_b");
    expect(escapeText("a*___*b", mid)).toBe("a\\*\\_\\_\\_\\*b");
  });

  it("看起來像字元實體的 & 要跳脫", () => {
    expect(escapeText("&amp; &#35; &#x23; &copy;", mid)).toBe("\\&amp; \\&#35; \\&#x23; \\&copy;");
    expect(escapeText("A & B &c", mid)).toBe("A & B &c");
  });

  it("一般文字與中文不變", () => {
    expect(escapeText("你好 world 123", mid)).toBe("你好 world 123");
  });
});

describe("escapeText：行首", () => {
  it("清單、引用、標題底線、定義與 div 的標記", () => {
    for (const marker of ["+", "-", ">", "=", ":"]) {
      expect(escapeText(`${marker} x`, start)).toBe(`\\${marker} x`);
      expect(escapeText(marker, start)).toBe(`\\${marker}`);
    }
    expect(escapeText("---", start)).toBe("\\---");
    expect(escapeText(":::", start)).toBe("\\:::");
  });

  it("標題記號與有序清單記號", () => {
    expect(escapeText("# x", start)).toBe("\\# x");
    expect(escapeText("###### x", start)).toBe("\\###### x");
    expect(escapeText("1. x", start)).toBe("1\\. x");
    expect(escapeText("23) x", start)).toBe("23\\) x");
  });

  it("不在行首時這些字元不用跳脫", () => {
    expect(escapeText("a - b + c > d = e : f # g 1. h", mid)).toBe("a - b + c > d = e : f # g 1. h");
  });
});

describe("escapeText：標題內", () => {
  it("每個 # 都跳脫（避免被當成結尾的 # 序列）", () => {
    expect(escapeText("C# and F#", { startOfLine: false, inHeading: true })).toBe("C\\# and F\\#");
  });
});
