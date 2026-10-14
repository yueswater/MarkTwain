import { describe, expect, it } from "@jest/globals";
import { columnPercent, rowHeightPoints } from "./table-resize";

describe("resize values", () => {
  it("turns a dragged row height in pixels into points, never below one line", () => {
    expect(rowHeightPoints(40)).toBe(30);
    expect(rowHeightPoints(100)).toBe(75);
    expect(rowHeightPoints(5)).toBe(12);
  });

  it("turns a dragged column width in pixels into a percent of the table with one decimal", () => {
    expect(columnPercent(350)).toBe(50);
    expect(columnPercent(210)).toBe(30);
    expect(columnPercent(233)).toBe(33.3);
  });
});
