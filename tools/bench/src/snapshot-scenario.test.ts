import { afterAll, describe, expect, it } from "@jest/globals";
import { SnapshotBench } from "./snapshot-scenario";

describe("the snapshot scenario", () => {
  const bench = new SnapshotBench(200);
  afterAll(() => bench.close());

  it("saves a version at every step, and the history grows by one each time", () => {
    const steps = Array.from({ length: 30 }, () => bench.step());
    expect(steps.map((step) => step.n)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(steps[29]?.historySize).toBe(31);
    expect(steps.every((step) => step.ms >= 0)).toBe(true);
  });

  it("sums up the first and the last saves", () => {
    const summary = bench.summary();
    expect(summary.count).toBe(30);
    expect(summary.firstMedianMs).toBeGreaterThan(0);
    expect(summary.ratio).toBeGreaterThan(0);
  });
});
