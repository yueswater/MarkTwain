import { describe, expect, it } from "@jest/globals";
import { BOLD_INPUT, ITALIC_INPUT, STRIKE_INPUT } from "./marks";

const inner = (re: RegExp, text: string) => re.exec(text)?.[2];

describe("強調的輸入規則", () => {
  it("中文文字緊貼符號也能觸發", () => {
    expect(inner(BOLD_INPUT, "這是**重點**")).toBe("重點");
    expect(inner(ITALIC_INPUT, "這是*重點*")).toBe("重點");
    expect(inner(STRIKE_INPUT, "這是~~作廢~~")).toBe("作廢");
  });

  it("英文與空白前綴一樣可用", () => {
    expect(inner(BOLD_INPUT, "a **bold**")).toBe("bold");
    expect(inner(ITALIC_INPUT, "an *italic*")).toBe("italic");
  });

  it("輸入粗體時，第一個結尾的 * 不會被當成斜體", () => {
    expect(ITALIC_INPUT.test("這是**重點*")).toBe(false);
    expect(ITALIC_INPUT.test("這是**重點**")).toBe(false);
  });

  it("星號旁是空白時不觸發", () => {
    expect(ITALIC_INPUT.test("2 * 3 * ")).toBe(false);
    expect(BOLD_INPUT.test("a ** b **")).toBe(false);
  });
});
