import { describe, expect, it } from "@jest/globals";
import { clampPlace, placeAt } from "./preview-place";

const pages = [
  { y: 0, height: 800 },
  { y: 810, height: 800 },
  { y: 1620, height: 800 },
];

describe("preview place", () => {
  it("finds the page and the distance down it", () => {
    expect(placeAt(pages, 0)).toEqual({ page: 1, y: 0 });
    expect(placeAt(pages, 950)).toEqual({ page: 2, y: 140 });
    expect(placeAt(pages, 5000)).toEqual({ page: 3, y: 800 });
  });

  it("a position in the gap belongs to the page above", () => {
    expect(placeAt(pages, 805)).toEqual({ page: 1, y: 800 });
  });

  it("keeps the place inside a thesis that got shorter", () => {
    expect(clampPlace(pages, { page: 9, y: 300 })).toEqual({ page: 3, y: 300 });
    expect(clampPlace(pages, { page: 2, y: 9999 })).toEqual({ page: 2, y: 800 });
    expect(clampPlace([], { page: 4, y: 1 })).toEqual({ page: 4, y: 1 });
  });
});
