import { describe, expect, it } from "@jest/globals";
import { baseEdges, hKey, solid, vKey, type Grid } from "@marktwain/schema";
import { applyItem, applyPen, isOn, targetKeys } from "./table-border-items";

const grid: Grid = { rows: 3, cols: 3, header: true, style: "three-line" };
const whole = { top: 0, left: 0, bottom: 3, right: 3 };
const center = { top: 1, left: 1, bottom: 2, right: 2 };
const pen = solid(0.5);

describe("targetKeys", () => {
  it("sides of a selection", () => {
    expect(targetKeys("bottom", center, grid)).toEqual([hKey(2, 1)]);
    expect(targetKeys("top", whole, grid)).toEqual([hKey(0, 0), hKey(0, 1), hKey(0, 2)]);
    expect(targetKeys("left", center, grid)).toEqual([vKey(1, 1)]);
    expect(targetKeys("right", whole, grid)).toEqual([vKey(3, 0), vKey(3, 1), vKey(3, 2)]);
  });

  it("outside, inside and all", () => {
    expect(targetKeys("outside", center, grid)).toHaveLength(4);
    expect(targetKeys("inside", center, grid)).toEqual([]);
    expect(targetKeys("insideH", whole, grid)).toHaveLength(6);
    expect(targetKeys("insideV", whole, grid)).toHaveLength(6);
    expect(targetKeys("inside", whole, grid)).toHaveLength(12);
    expect(targetKeys("all", whole, grid)).toHaveLength(24);
  });

  it("a rule under the row reaches across the table", () => {
    expect(targetKeys("horizontalLine", center, grid)).toEqual([hKey(2, 0), hKey(2, 1), hKey(2, 2)]);
  });

  it("pieces inside a merged cell are left out", () => {
    const merged: Grid = { ...grid, area: (r, c) => (r <= 1 && c === 0 ? 0 : 1 + r * 3 + c) };
    expect(targetKeys("insideH", { top: 0, left: 0, bottom: 2, right: 1 }, merged)).toEqual([]);
  });
});

describe("applyItem", () => {
  it("draws with the pen, and a second click turns the same lines off", () => {
    const edges = baseEdges(grid);
    const drawn = applyItem("insideH", edges, whole, grid, pen);
    expect(drawn.get(hKey(2, 1))).toEqual(pen);
    expect(isOn("insideH", drawn, whole, grid)).toBe(true);
    expect(isOn("insideV", drawn, whole, grid)).toBe(false);
    const off = applyItem("insideH", drawn, whole, grid, pen);
    expect(off.get(hKey(2, 1))).toBeNull();
    expect(isOn("insideH", off, whole, grid)).toBe(false);
  });

  it("no border clears every line of the selection and is on when there are none", () => {
    const edges = baseEdges(grid);
    expect(isOn("none", edges, whole, grid)).toBe(false);
    const cleared = applyItem("none", edges, whole, grid, pen);
    expect(isOn("none", cleared, whole, grid)).toBe(true);
    expect(cleared.get(hKey(0, 0))).toBeNull();
  });

  it("an item partly on is drawn in full the first time", () => {
    const edges = baseEdges(grid);
    expect(isOn("outside", edges, whole, grid)).toBe(false);
    const drawn = applyItem("outside", edges, whole, grid, pen);
    expect(drawn.get(vKey(0, 1))).toEqual(pen);
    expect(drawn.get(hKey(3, 2))).toEqual(pen);
  });

  it("the pen changes only lines that exist", () => {
    const edges = baseEdges(grid);
    const next = applyPen(edges, whole, grid, { width: 3, style: "dashed", color: null });
    expect(next.get(hKey(0, 0))).toEqual({ width: 3, style: "dashed", color: null });
    expect(next.get(hKey(2, 0))).toBeNull();
  });
});
