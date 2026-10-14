import { describe, expect, it } from "@jest/globals";
import { placeAt, scrollFor } from "./preview-place";

// Three pages of 100 high, 16 apart
const pages = [
  { top: 16, height: 100 },
  { top: 132, height: 100 },
  { top: 248, height: 100 },
];

describe("placeAt and scrollFor", () => {
  it("reads the page and the share of it at the top edge", () => {
    expect(placeAt(pages, 0)).toEqual({ page: 0, frac: 0 });
    expect(placeAt(pages, 182)).toEqual({ page: 1, frac: 0.5 });
  });

  it("returns to the same scroll position", () => {
    for (const top of [0, 50, 132, 200, 260]) expect(Math.abs(scrollFor(pages, placeAt(pages, top)) - Math.max(top, 16))).toBeLessThanOrEqual(1);
  });

  it("clamps a page that no longer exists and handles no pages", () => {
    expect(scrollFor(pages.slice(0, 2), { page: 2, frac: 0.5 })).toBe(182);
    expect(scrollFor([], { page: 3, frac: 0.5 })).toBe(0);
    expect(placeAt([], 40)).toEqual({ page: 0, frac: 0 });
  });
});
