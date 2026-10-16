import { describe, expect, it } from "@jest/globals";
import { runMergeScenario } from "./merge-scenario";

describe("the merge scenario", () => {
  it("merges the changes of both sides without a conflict, at every share of changed blocks", () => {
    for (const percent of [1, 10, 50]) {
      const run = runMergeScenario(1000, percent);
      expect(run.errors).toEqual([]);
      expect(run).toMatchObject({ ok: true, conflicts: 0, blocks: 1000 });
    }
  });

  it("finds a conflict for every changed block when both sides change the same ones, and gives the main line back when it is chosen", () => {
    const run = runMergeScenario(1000, 10, true);
    expect(run.errors).toEqual([]);
    expect(run.conflicts).toBe(100);
  });

  it("reports the time and the memory", () => {
    const run = runMergeScenario(2000, 10);
    expect(run.mergeMs).toBeGreaterThanOrEqual(0);
    expect(run.rssMb).toBeGreaterThan(0);
  });
});
