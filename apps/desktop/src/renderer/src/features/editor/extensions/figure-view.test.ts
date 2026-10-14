import { describe, expect, it } from "@jest/globals";
import { widthPercent } from "./figure-view";

describe("widthPercent", () => {
  it("grows both sides when an east corner moves out, so the figure stays centred", () => {
    expect(widthPercent(400, 50, "se", 800)).toBe(63);
    expect(widthPercent(400, 50, "ne", 800)).toBe(63);
  });

  it("works the other way round on a west corner", () => {
    expect(widthPercent(400, -50, "nw", 800)).toBe(63);
    expect(widthPercent(400, 50, "sw", 800)).toBe(38);
  });

  it("stays between a tenth and the full width", () => {
    expect(widthPercent(400, 5000, "se", 800)).toBe(100);
    expect(widthPercent(400, -5000, "se", 800)).toBe(10);
    expect(widthPercent(400, 10, "se", 0)).toBe(100);
  });
});
