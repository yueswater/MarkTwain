import { describe, expect, it } from "@jest/globals";
import { bulletSymbol, formatOrdered, levelAt, LIST_PRESETS, resolveListLevels } from "./styles";

describe("formatOrdered", () => {
  it("writes each style", () => {
    expect(formatOrdered("decimal", 3)).toBe("3.");
    expect(formatOrdered("decimal-paren", 3)).toBe("(3)");
    expect(formatOrdered("decimal-bracket", 3)).toBe("3)");
    expect(formatOrdered("circled", 3)).toBe("③");
    expect(formatOrdered("lower-alpha", 3)).toBe("c.");
    expect(formatOrdered("upper-alpha", 3)).toBe("C.");
    expect(formatOrdered("lower-roman", 4)).toBe("iv.");
    expect(formatOrdered("upper-roman", 9)).toBe("IX.");
    expect(formatOrdered("cjk", 3)).toBe("三、");
    expect(formatOrdered("cjk-paren", 3)).toBe("(三)");
  });

  it("goes past ten", () => {
    expect(formatOrdered("cjk", 10)).toBe("十、");
    expect(formatOrdered("cjk", 11)).toBe("十一、");
    expect(formatOrdered("cjk", 21)).toBe("二十一、");
    expect(formatOrdered("cjk", 100)).toBe("一百、");
    expect(formatOrdered("cjk", 101)).toBe("一百零一、");
    expect(formatOrdered("cjk", 111)).toBe("一百一十一、");
    expect(formatOrdered("circled", 21)).toBe("㉑");
    expect(formatOrdered("circled", 36)).toBe("㊱");
    expect(formatOrdered("circled", 51)).toBe("51");
    expect(formatOrdered("lower-alpha", 27)).toBe("aa.");
    expect(formatOrdered("lower-alpha", 28)).toBe("ab.");
    expect(formatOrdered("upper-alpha", 53)).toBe("BA.");
    expect(formatOrdered("lower-roman", 44)).toBe("xliv.");
  });

  it("keeps a start number and does not fail on a bad one", () => {
    expect(formatOrdered("cjk", 5)).toBe("五、");
    expect(formatOrdered("cjk", 0)).toBe("0");
    expect(formatOrdered("unknown", 2)).toBe("2.");
  });
});

describe("levels", () => {
  it("starts again from the first level when a list is deeper than the levels", () => {
    expect(levelAt(["a", "b", "c"], 1)).toBe("a");
    expect(levelAt(["a", "b", "c"], 3)).toBe("c");
    expect(levelAt(["a", "b", "c"], 4)).toBe("a");
    expect(levelAt([], 2)).toBeUndefined();
  });

  it("leaves out names that are unknown and keeps the default for an empty kind", () => {
    expect(resolveListLevels({ ordered: ["cjk", "nope", "decimal"], bullet: ["x"] })).toEqual({ ordered: ["cjk", "decimal"], bullet: null });
    expect(resolveListLevels(undefined)).toEqual({ ordered: null, bullet: null });
  });

  it("has presets that use known names only", () => {
    for (const preset of LIST_PRESETS) {
      if (!preset.levels) continue;
      expect(resolveListLevels(preset.levels)).toEqual(preset.levels);
    }
    expect(bulletSymbol("diamond")).toBe("◆");
    expect(bulletSymbol("zzz")).toBe("•");
  });
});
