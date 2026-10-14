import { describe, expect, it } from "@jest/globals";
import { renderLatex } from "./MathDialog";

describe("renderLatex", () => {
  it("合法的公式回傳 HTML，含 KaTeX 的標記", () => {
    expect(renderLatex("\\frac{a}{b}", false)).toContain("katex");
    expect(renderLatex("x^2", true)).toContain("katex-display");
  });

  it("語法錯誤回傳 null，不丟例外", () => {
    expect(renderLatex("\\frac{a", false)).toBeNull();
    expect(renderLatex("\\notacommand", false)).toBeNull();
  });
});
