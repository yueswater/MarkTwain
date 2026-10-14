import { describe, expect, it } from "@jest/globals";
import { shortenMath, shortenText } from "./shorten";

describe("shortenMath", () => {
  it("keeps a short formula and tidies its spaces", () => {
    expect(shortenMath("a  +\n b")).toBe("a + b");
  });

  it("ends a long formula with three dots", () => {
    const out = shortenMath("a + b + c + d + e + f + g + h + i + j + k + l", 20);
    expect(out.endsWith("...")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(23);
  });

  it("never cuts inside a group or a command", () => {
    const source = String.raw`x_{I}^{\text{IU}} (v_{H}) > x_{I}^{\text{UI}} (v_{H}) > x_{I}^{\text{SS}} (v_{H})`;
    for (let max = 6; max < source.length; max += 1) {
      const out = shortenMath(source, max);
      const head = out.replace(/\.\.\.$/, "");
      let depth = 0;
      for (const ch of head) depth += ch === "{" ? 1 : ch === "}" ? -1 : 0;
      expect({ max, depth }).toEqual({ max, depth: 0 });
      expect(head).not.toMatch(/\\[a-z]*$/);
    }
  });

  it("does not end after a command that needs an argument or after an operator", () => {
    expect(shortenMath(String.raw`a + \frac{1}{2} + b + c + d + e`, 8)).not.toMatch(/\\frac\.\.\.$/);
    expect(shortenMath("x^{2} + y^{2} + z^{2} + w^{2}", 6)).not.toMatch(/\^\.\.\.$/);
  });

  it("falls back to a plain cut when no clean place exists", () => {
    expect(shortenMath("{" + "a".repeat(80), 10)).toBe("{aaaaaaaaa...");
  });
});

describe("shortenText", () => {
  it("shortens long text and keeps short text", () => {
    expect(shortenText("均衡投入與報酬之比較")).toBe("均衡投入與報酬之比較");
    expect(shortenText("一二三四五六七八九十", 4)).toBe("一二三四...");
  });

  it("counts characters outside the basic plane once", () => {
    expect(shortenText("𠀀𠀁𠀂𠀃𠀄", 3)).toBe("𠀀𠀁𠀂...");
  });
});
