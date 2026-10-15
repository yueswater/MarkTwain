import { describe, expect, it } from "@jest/globals";
import {
  baseEdges,
  dKey,
  diffRules,
  effectiveEdges,
  formatBorders,
  hKey,
  normalizeBorders,
  parseBorders,
  solid,
  vKey,
  type Grid,
} from "./table-borders";

const grid: Grid = { rows: 3, cols: 2, header: true, style: "three-line" };

describe("table borders attribute", () => {
  it("reads and writes lines with width, style and color", () => {
    const rules = parseBorders("h1.*=0.5;v1.0-1=1/dashed;dd0.0=0.5/solid/#ff0000;h-1.*=none");
    expect(rules).toHaveLength(4);
    expect(formatBorders(rules)).toBe("h1.*=0.5;v1.0-1=1/dashed;dd0.0=0.5/solid/#FF0000;h-1.*=none");
  });

  it("drops what does not fit", () => {
    expect(parseBorders("x1.*=1;h1.*=thick;h1.3-1=1;v1.*=1/wavy;h1.*=-2;h2.*=1/dashed/red")).toEqual([]);
  });
});

describe("table borders lines", () => {
  it("three-line has a thick line above and below and a thin one under the header", () => {
    const edges = baseEdges(grid);
    expect(edges.get(hKey(0, 0))).toEqual(solid(1));
    expect(edges.get(hKey(1, 1))).toEqual(solid(0.6));
    expect(edges.get(hKey(3, 0))).toEqual(solid(1));
    expect(edges.get(hKey(2, 0))).toBeNull();
    expect(edges.get(vKey(1, 0))).toBeNull();
  });

  it("grid has every line", () => {
    const edges = baseEdges({ ...grid, style: "grid" });
    expect(edges.get(hKey(2, 1))).toEqual(solid(0.5));
    expect(edges.get(vKey(1, 2))).toEqual(solid(0.5));
  });

  it("rules change pieces on top of the preset, and -1 is the last line", () => {
    const edges = effectiveEdges(grid, parseBorders("h-1.*=2.25;v1.1-2=0.5/dotted;h0.0=none"));
    expect(edges.get(hKey(3, 1))).toEqual(solid(2.25));
    expect(edges.get(vKey(1, 0))).toBeNull();
    expect(edges.get(vKey(1, 1))).toEqual({ width: 0.5, style: "dotted", color: null });
    expect(edges.get(hKey(0, 0))).toBeNull();
    expect(edges.get(hKey(0, 1))).toEqual(solid(1));
  });

  it("a line inside a merged cell is not drawn", () => {
    const merged: Grid = { ...grid, style: "grid", area: (r, c) => (r <= 1 && c === 0 ? 0 : 1 + r * 2 + c) };
    const edges = effectiveEdges(merged, parseBorders("h1.*=3"));
    expect(edges.get(hKey(1, 0))).toBeNull();
    expect(edges.get(hKey(1, 1))).toEqual(solid(3));
  });

  it("the writer keeps only what differs from the preset, one entry for a run", () => {
    const edges = baseEdges(grid);
    for (let x = 0; x < 2; x += 1) edges.set(hKey(2, x), solid(0.5));
    edges.set(vKey(1, 0), solid(1));
    edges.set(vKey(1, 1), solid(1));
    edges.set(dKey("dd", 0, 0), solid(0.5));
    edges.set(hKey(3, 0), null);
    expect(formatBorders(diffRules(grid, edges))).toBe("h2.*=0.5;h-1.0=none;v1.0-1=1;dd0.0=0.5");
    expect(parseBorders(formatBorders(diffRules(grid, edges)))).toEqual(diffRules(grid, edges));
  });

  it("a table that matches a preset is written as the preset with no attribute", () => {
    expect(normalizeBorders(grid, baseEdges(grid))).toEqual({ style: "three-line", borders: "" });
    expect(normalizeBorders(grid, baseEdges({ ...grid, style: "grid" }))).toEqual({ style: "grid", borders: "" });
    const edges = baseEdges(grid);
    edges.set(hKey(2, 0), solid(1));
    expect(normalizeBorders(grid, edges).borders).toBe("h2.0=1");
  });
});

describe("old double lines", () => {
  it("a double line of an old document is read as a solid one", () => {
    expect(parseBorders("h1.*=1/double")[0]?.edge).toEqual({ width: 1, style: "solid", color: null });
    expect(parseBorders("h1.*=1/wavy")).toEqual([]);
  });
});
