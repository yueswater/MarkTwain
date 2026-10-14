import { describe, expect, it } from "@jest/globals";
import { buildCloneArgs, isUpToDate } from "./fetch";

const entry = {
  repo: "TW-Thesis/tw-thesis-typ",
  tag: "v1.0.0",
  commit: "61ca45c47da54e11600a6af2b1f4c03775f1a569",
};

describe("isUpToDate", () => {
  it("標記檔的 tag 與 commit 都一致時為 true", () => {
    expect(isUpToDate({ tag: "v1.0.0", commit: entry.commit }, entry)).toBe(true);
  });

  it("commit 不同時為 false", () => {
    expect(isUpToDate({ tag: "v1.0.0", commit: "0".repeat(40) }, entry)).toBe(false);
  });

  it("tag 不同時為 false", () => {
    expect(isUpToDate({ tag: "v2.0.0", commit: entry.commit }, entry)).toBe(false);
  });

  it("標記檔不是物件時為 false", () => {
    expect(isUpToDate(null, entry)).toBe(false);
    expect(isUpToDate("x", entry)).toBe(false);
  });
});

describe("buildCloneArgs", () => {
  it("以 gh 淺層 clone 指定的 tag", () => {
    expect(buildCloneArgs(entry, "/tmp/x")).toEqual([
      "repo",
      "clone",
      "TW-Thesis/tw-thesis-typ",
      "/tmp/x",
      "--",
      "--depth",
      "1",
      "--branch",
      "v1.0.0",
    ]);
  });
});
