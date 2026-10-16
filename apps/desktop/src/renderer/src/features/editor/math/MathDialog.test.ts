import { describe, expect, it } from "@jest/globals";
import { latexErrorNear, placeBox, renderLatex } from "./MathDialog";

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

describe("placeBox", () => {
  const view = { width: 1000, height: 700 };
  const size = { width: 380, height: 120 };

  it("opens under the formula, level with its left edge", () => {
    expect(placeBox({ top: 100, bottom: 120, left: 200, right: 260 }, size, view)).toEqual({ top: 128, left: 200 });
  });

  it("opens above the formula when there is no room below", () => {
    expect(placeBox({ top: 600, bottom: 620, left: 200, right: 260 }, size, view)).toEqual({ top: 472, left: 200 });
  });

  it("stays inside the window at the left and the right", () => {
    expect(placeBox({ top: 100, bottom: 120, left: -50, right: 0 }, size, view).left).toBe(8);
    expect(placeBox({ top: 100, bottom: 120, left: 950, right: 990 }, size, view).left).toBe(612);
  });

  it("does not leave the top of the window", () => {
    expect(placeBox({ top: 20, bottom: 40, left: 10, right: 50 }, { width: 380, height: 700 }, view).top).toBe(8);
  });
});

describe("latexErrorNear", () => {
  it("is null for a formula that can be read", () => {
    expect(latexErrorNear("\\frac{a}{b}")).toBeNull();
  });

  it("names the few letters around the place where KaTeX stopped", () => {
    expect(latexErrorNear("\\badcommand{x} + 1")).toContain("\\badcommand");
    expect(latexErrorNear("a + b ^")).toContain("^");
    // A formula that ends before it is complete stops at its end
    expect(latexErrorNear("\\frac{a")).toContain("frac");
    expect(latexErrorNear("\\frac{a}{b")).not.toBeNull();
  });
});
