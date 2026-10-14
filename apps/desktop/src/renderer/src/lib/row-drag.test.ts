import { describe, expect, it } from "@jest/globals";
import { autoScrollStep, dropTarget, type RowBox } from "./row-drag";

// abstract at 0, chapters at 30 60 90, appendix at 120, rows 30 high
const rows: RowBox[] = [
  { id: "abs", kind: "abstract", top: 0, bottom: 30 },
  { id: "c1", kind: "chapter", top: 30, bottom: 60 },
  { id: "c2", kind: "chapter", top: 60, bottom: 90 },
  { id: "c3", kind: "chapter", top: 90, bottom: 120 },
  { id: "app", kind: "appendix", top: 120, bottom: 150 },
];

describe("dropTarget", () => {
  it("picks before or after by the half of the row", () => {
    expect(dropTarget(rows, "c3", 65)).toEqual({ targetId: "c2", placement: "before" });
    expect(dropTarget(rows, "c1", 80)).toEqual({ targetId: "c2", placement: "after" });
  });

  it("accepts the first and the last place of the kind", () => {
    expect(dropTarget(rows, "c3", 32)).toEqual({ targetId: "c1", placement: "before" });
    expect(dropTarget(rows, "c1", 118)).toEqual({ targetId: "c3", placement: "after" });
  });

  it("accepts the edge of the neighbour as the end of the kind", () => {
    // Over the upper half of the abstract it is still next to the chapters only when close, so it is refused
    expect(dropTarget(rows, "c3", 5)).toBeNull();
    expect(dropTarget(rows, "c3", 28)).toEqual({ targetId: "c1", placement: "before" });
    expect(dropTarget(rows, "c1", 125)).toEqual({ targetId: "c3", placement: "after" });
  });

  it("refuses a place that changes nothing", () => {
    expect(dropTarget(rows, "c2", 62)).toBeNull();
    expect(dropTarget(rows, "c2", 88)).toBeNull();
    expect(dropTarget(rows, "c1", 62)).toBeNull();
  });

  it("refuses a single row and an unknown row", () => {
    expect(dropTarget(rows, "abs", 20)).toBeNull();
    expect(dropTarget(rows, "none", 20)).toBeNull();
  });

  it("refuses the rows of another kind", () => {
    expect(dropTarget(rows, "app", 140)).toBeNull();
  });
});

describe("autoScrollStep", () => {
  it("scrolls near the edges and not in the middle", () => {
    expect(autoScrollStep(100, 0, 400)).toBe(0);
    expect(autoScrollStep(5, 0, 400)).toBeLessThan(0);
    expect(autoScrollStep(395, 0, 400)).toBeGreaterThan(0);
  });

  it("scrolls faster closer to the edge", () => {
    expect(Math.abs(autoScrollStep(2, 0, 400))).toBeGreaterThan(Math.abs(autoScrollStep(25, 0, 400)));
  });
});
