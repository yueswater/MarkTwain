import { describe, expect, it } from "@jest/globals";
import { clusterLines } from "./line-numbers";

describe("clusterLines", () => {
  it("makes one line of the boxes that sit side by side", () => {
    expect(clusterLines([{ top: 0, bottom: 20 }, { top: 1, bottom: 21 }, { top: 0, bottom: 19 }])).toEqual([{ top: 0, height: 21 }]);
  });

  it("keeps lines that follow each other apart, in reading order", () => {
    const lines = clusterLines([{ top: 40, bottom: 60 }, { top: 0, bottom: 20 }, { top: 20, bottom: 40 }]);
    expect(lines.map((line) => line.top)).toEqual([0, 20, 40]);
  });

  it("puts a tall atom on the line of the text next to it", () => {
    // A formula taller than the text still shares most of the text height
    expect(clusterLines([{ top: 5, bottom: 20 }, { top: 0, bottom: 30 }])).toEqual([{ top: 0, height: 30 }]);
  });

  it("ignores boxes with no height", () => {
    expect(clusterLines([{ top: 5, bottom: 5 }])).toEqual([]);
  });
});
