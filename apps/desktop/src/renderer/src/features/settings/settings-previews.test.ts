import { describe, expect, it } from "@jest/globals";
import { expandPattern, numberingSample, outlineLines, pageGeometry, perChapterExample, sampleNumbers, spreadTitle } from "./settings-previews";

describe("pageGeometry", () => {
  it("places the text area by the margins on an A4 page", () => {
    const g = pageGeometry("a4", { top: 2.97, bottom: 2.97, left: 2.1, right: 2.1 });
    expect(g.valid).toBe(true);
    expect(g.text.left).toBeCloseTo(10, 5);
    expect(g.text.top).toBeCloseTo(10, 5);
    expect(g.text.width).toBeCloseTo(80, 5);
    expect(g.text.height).toBeCloseTo(80, 5);
  });

  it("uses the shape of the paper and falls back to A4", () => {
    expect(pageGeometry("b5", { top: 1, bottom: 1, left: 1, right: 1 }).widthCm).toBe(17.6);
    expect(pageGeometry("nope", { top: 1, bottom: 1, left: 1, right: 1 }).widthCm).toBe(21);
  });

  it("reports margins that leave no room and keeps the area inside the page", () => {
    const g = pageGeometry("a4", { top: 20, bottom: 20, left: 12, right: 12 });
    expect(g.valid).toBe(false);
    for (const value of Object.values(g.text)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe("expandPattern", () => {
  it("fills the three placeholders", () => {
    expect(expandPattern("第{C}章第{S}節第{B}小節", sampleNumbers("第{C}章"))).toEqual({ ok: true, text: "第三章第二節第一小節" });
    expect(expandPattern("Chapter {C}", sampleNumbers("Chapter {C}"))).toEqual({ ok: true, text: "Chapter 3" });
  });

  it("reports an unknown or an open placeholder", () => {
    expect(expandPattern("第{X}章", { C: "3", S: "2", B: "1" })).toEqual({ ok: false, problem: "{X}" });
    expect(expandPattern("第{C章", { C: "3", S: "2", B: "1" })).toEqual({ ok: false, problem: "{C章" });
    expect(expandPattern("第C}章", { C: "3", S: "2", B: "1" })).toEqual({ ok: false, problem: "}" });
  });
});

describe("numbering examples", () => {
  it("writes the first numbers of each style", () => {
    expect(numberingSample("1")).toEqual(["1", "2", "3"]);
    expect(numberingSample("a")).toEqual(["a", "b", "c"]);
    expect(numberingSample("I")).toEqual(["I", "II", "III"]);
    expect(numberingSample("*")).toEqual(["*", "†", "‡"]);
  });

  it("shows how numbers restart with the chapter", () => {
    expect(perChapterExample("equation", true, "1")).toBe("(3.1)  (3.2)  (4.1)");
    expect(perChapterExample("equation", false, "1")).toBe("(1)  (2)  (3)");
    expect(perChapterExample("footnote", true, "a")).toBe("a  b  ...  a");
    expect(perChapterExample("footnote", false, "i")).toBe("i  ii  iii");
  });
});

describe("outline and title", () => {
  it("marks the lines inside the depth", () => {
    expect(outlineLines(2).map((line) => line.shown)).toEqual([true, true, false, false]);
    expect(outlineLines(4).every((line) => line.shown)).toBe(true);
  });

  it("turns the tilde into space", () => {
    expect(spreadTitle("參~考~文~獻")).toBe("參 考 文 獻");
  });
});
