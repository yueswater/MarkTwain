import { describe, expect, it } from "@jest/globals";
import { PREF_LIMITS } from "../../../../shared/prefs";
import { AUTOSAVE_STEPS, CODE_SIZE_LEVELS, PPI_LEVELS, PREVIEW_STEPS, nearestLevel, nearestStep, onStep, secondsText } from "./settings-steps";

describe("steps", () => {
  it("has ten steps from the slowest to the fastest, inside the limits", () => {
    for (const [steps, limit] of [[AUTOSAVE_STEPS, PREF_LIMITS.autosaveDelayMs], [PREVIEW_STEPS, PREF_LIMITS.previewDelayMs]] as const) {
      expect(steps).toHaveLength(10);
      expect([...steps]).toEqual([...steps].sort((a, b) => b - a));
      for (const value of steps) {
        expect(value).toBeGreaterThanOrEqual(limit[0]);
        expect(value).toBeLessThanOrEqual(limit[1]);
      }
    }
  });

  it("holds the defaults on a step", () => {
    expect(onStep(AUTOSAVE_STEPS, 800)).toBe(true);
    expect(onStep(PREVIEW_STEPS, 700)).toBe(true);
  });

  it("finds the closest step for a value in between", () => {
    expect(nearestStep(AUTOSAVE_STEPS, 800)).toBe(5);
    expect(nearestStep(AUTOSAVE_STEPS, 900)).toBe(5);
    expect(nearestStep(AUTOSAVE_STEPS, 100)).toBe(9);
    expect(nearestStep(AUTOSAVE_STEPS, 99999)).toBe(0);
  });

  it("writes a delay in seconds", () => {
    expect(secondsText(5000)).toBe("5 s");
    expect(secondsText(1300)).toBe("1.3 s");
    expect(secondsText(800)).toBe("0.8 s");
    expect(secondsText(250)).toBe("0.25 s");
  });

  it("maps a value to the nearest level", () => {
    expect(nearestLevel(PPI_LEVELS, 110).id).toBe("normal");
    expect(nearestLevel(PPI_LEVELS, 130).id).toBe("normal");
    expect(nearestLevel(PPI_LEVELS, 140).id).toBe("sharp");
    expect(nearestLevel(CODE_SIZE_LEVELS, 14).id).toBe("normal");
    expect(nearestLevel(CODE_SIZE_LEVELS, 24).id).toBe("larger");
  });
});
