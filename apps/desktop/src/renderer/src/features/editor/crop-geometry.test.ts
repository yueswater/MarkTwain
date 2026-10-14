import { describe, expect, it } from "@jest/globals";
import { FULL, isFull, moveRect, pixelBox, resizeRect } from "./crop-geometry";

describe("crop geometry", () => {
  it("moves inside the image and stops at the edges", () => {
    const moved = moveRect({ x: 0.2, y: 0.2, w: 0.5, h: 0.5 }, 0.1, -0.1);
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.1);
    expect(moveRect({ x: 0.2, y: 0.2, w: 0.5, h: 0.5 }, 5, 5)).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
    expect(moveRect({ x: 0.2, y: 0.2, w: 0.5, h: 0.5 }, -5, -5)).toEqual({ x: 0, y: 0, w: 0.5, h: 0.5 });
  });

  it("resizes from a corner and keeps the opposite corner where it is", () => {
    const rect = { x: 0.2, y: 0.2, w: 0.5, h: 0.5 };
    const se = resizeRect(rect, "se", 0.1, 0.1);
    expect([se.x, se.y]).toEqual([0.2, 0.2]);
    expect(se.w).toBeCloseTo(0.6);
    expect(se.h).toBeCloseTo(0.6);
    const nw = resizeRect(rect, "nw", 0.1, 0.1);
    expect(nw.x + nw.w).toBeCloseTo(0.7);
    expect(nw.y + nw.h).toBeCloseTo(0.7);
  });

  it("never gets smaller than a few percent or past the image", () => {
    const rect = { x: 0.2, y: 0.2, w: 0.5, h: 0.5 };
    expect(resizeRect(rect, "se", -5, -5).w).toBeCloseTo(0.05);
    expect(resizeRect(rect, "se", 5, 5)).toEqual({ x: 0.2, y: 0.2, w: 0.8, h: 0.8 });
    expect(resizeRect(rect, "nw", -5, -5)).toEqual({ x: 0, y: 0, w: 0.7, h: 0.7 });
  });

  it("converts to pixels of the natural image", () => {
    expect(pixelBox({ x: 0.25, y: 0.5, w: 0.5, h: 0.25 }, 800, 400)).toEqual({ sx: 200, sy: 200, sw: 400, sh: 100 });
    expect(pixelBox({ x: 0, y: 0, w: 0.0001, h: 0.0001 }, 800, 400)).toMatchObject({ sw: 1, sh: 1 });
  });

  it("knows the whole image", () => {
    expect(isFull(FULL)).toBe(true);
    expect(isFull({ x: 0, y: 0, w: 0.9, h: 1 })).toBe(false);
  });
});
