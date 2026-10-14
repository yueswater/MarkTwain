import { describe, expect, it } from "@jest/globals";
import { INLINE_MATH_INPUT } from "./math-input";

const latex = (text: string) => INLINE_MATH_INPUT.exec(text)?.[1];

describe("行內公式的輸入規則", () => {
  it("輸入結尾的 $ 時取出公式，中文緊貼也可以", () => {
    expect(latex("設 $x^2$")).toBe("x^2");
    expect(latex("，且設$y=1$")).toBe("y=1");
    expect(latex("$a$")).toBe("a");
    expect(latex("$a b$")).toBe("a b");
  });

  it("貨幣符號與空白內容不會誤觸發", () => {
    expect(INLINE_MATH_INPUT.test("價格 $5 與 $")).toBe(false);
    expect(INLINE_MATH_INPUT.test("$ x $")).toBe(false);
    expect(INLINE_MATH_INPUT.test("$x $")).toBe(false);
  });

  it("跳脫的 \\$ 與獨立公式的 $$ 不觸發", () => {
    expect(INLINE_MATH_INPUT.test("\\$x$")).toBe(false);
    expect(INLINE_MATH_INPUT.test("$$x$")).toBe(false);
  });
});
