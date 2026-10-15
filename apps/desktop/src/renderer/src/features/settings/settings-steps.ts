/** Ten steps for a delay, from the slowest, step 1, to the fastest, step 10. The values are milliseconds. */
export const AUTOSAVE_STEPS = [5000, 3500, 2500, 1800, 1300, 800, 500, 350, 250, 200] as const;
export const PREVIEW_STEPS = [5000, 3500, 2500, 1800, 1200, 700, 500, 350, 250, 200] as const;

/** Index of the step that is closest to the value. */
export function nearestStep(steps: readonly number[], value: number): number {
  let best = 0;
  for (let i = 1; i < steps.length; i += 1) {
    if (Math.abs(steps[i]! - value) < Math.abs(steps[best]! - value)) best = i;
  }
  return best;
}

export function onStep(steps: readonly number[], value: number): boolean {
  return steps.includes(value);
}

/** A delay written for people, in seconds with one decimal where needed. */
export function secondsText(ms: number): string {
  const seconds = ms / 1000;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(seconds < 1 ? 2 : 1).replace(/0$/, "")} s`;
}

export type Level = { id: string; value: number };

/** Sizes of code in the editor in pixels. */
export const CODE_SIZE_LEVELS: readonly Level[] = [
  { id: "small", value: 12 },
  { id: "normal", value: 14 },
  { id: "large", value: 16 },
  { id: "larger", value: 18 },
];

/** The level whose value is the closest. */
export function nearestLevel(levels: readonly Level[], value: number): Level {
  return levels.reduce((best, level) => (Math.abs(level.value - value) < Math.abs(best.value - value) ? level : best), levels[0]!);
}
