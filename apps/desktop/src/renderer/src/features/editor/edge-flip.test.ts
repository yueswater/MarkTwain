import { describe, expect, it } from "@jest/globals";
import { EdgeFlip, FLIP_DISTANCE, QUIET_MS } from "./edge-flip";

describe("EdgeFlip", () => {
  it("flips to the end after a swipe that begins at the bottom and goes far enough", () => {
    const gesture = new EdgeFlip();
    expect(gesture.push(1000, 50, false, true)).toMatchObject({ edge: "end", flip: null });
    expect(gesture.push(1016, 50, false, true).progress).toBeCloseTo(100 / FLIP_DISTANCE);
    expect(gesture.push(1032, 50, false, true)).toMatchObject({ flip: "end", progress: 1 });
  });

  it("goes back from the top", () => {
    const gesture = new EdgeFlip();
    expect(gesture.push(0, -80, true, false).edge).toBe("start");
    expect(gesture.push(16, -80, true, false).flip).toBe("start");
  });

  it("ignores a swipe that reaches the bottom on its own, and its momentum", () => {
    const gesture = new EdgeFlip();
    gesture.push(0, 80, false, false);
    for (let t = 16; t < 400; t += 16) expect(gesture.push(t, 80, false, true)).toEqual({ edge: null, progress: 0, flip: null });
  });

  it("counts a new swipe after a pause, even when the first one brought the page to the bottom", () => {
    const gesture = new EdgeFlip();
    gesture.push(0, 80, false, true);
    gesture.push(16, 80, false, true);
    gesture.push(50, 20, false, false);
    const later = 50 + QUIET_MS + 1;
    expect(gesture.push(later, 100, false, true).edge).toBe("end");
    expect(gesture.push(later + 16, 100, false, true).flip).toBe("end");
  });

  it("does not flip the other way, nor while the page is not at the end", () => {
    const gesture = new EdgeFlip();
    expect(gesture.push(0, -200, false, true)).toEqual({ edge: null, progress: 0, flip: null });
    expect(gesture.push(1000, 200, false, false)).toEqual({ edge: null, progress: 0, flip: null });
  });

  it("starts over when the swipe turns around", () => {
    const gesture = new EdgeFlip();
    gesture.push(0, 100, false, true);
    gesture.push(16, -100, false, true);
    expect(gesture.push(32, 100, false, true).flip).toBeNull();
  });

  it("needs a pause between two flips", () => {
    const gesture = new EdgeFlip();
    gesture.push(0, 200, false, true);
    expect(gesture.push(16, 200, false, true).flip).toBeNull();
  });
});
