import { describe, expect, it } from "@jest/globals";
import { clampWidth } from "./resizable-width";

describe("clampWidth", () => {
  it("keeps the width inside the range and rounds it", () => {
    expect(clampWidth(500.4, 320, 900)).toBe(500);
    expect(clampWidth(100, 320, 900)).toBe(320);
    expect(clampWidth(2000, 320, 900)).toBe(900);
  });

  it("never goes below the minimum, even in a tiny window", () => {
    expect(clampWidth(500, 320, 200)).toBe(320);
  });
});
