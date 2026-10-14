import { describe, expect, it } from "@jest/globals";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("黑色是 0，白色是 1", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("接受小寫與三位數的簡寫", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#5820f0")).toBeCloseTo(relativeLuminance("#5820F0"), 10);
  });

  it("不是十六進位色值時丟出錯誤", () => {
    expect(() => relativeLuminance("purple")).toThrow("hex");
    expect(() => relativeLuminance("#12345")).toThrow("hex");
  });
});

describe("contrastRatio", () => {
  it("黑白是 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("相同顏色是 1:1，且與順序無關", () => {
    expect(contrastRatio("#5820F0", "#5820F0")).toBeCloseTo(1, 5);
    expect(contrastRatio("#FFFFFF", "#5820F0")).toBe(contrastRatio("#5820F0", "#FFFFFF"));
  });

  it("主色上的白字約 7.3:1", () => {
    expect(contrastRatio("#5820F0", "#FFFFFF")).toBeGreaterThan(7.2);
    expect(contrastRatio("#5820F0", "#FFFFFF")).toBeLessThan(7.4);
  });
});
