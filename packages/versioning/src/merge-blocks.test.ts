import { describe, expect, it } from "@jest/globals";
import { mergeBlocks, type Part } from "./merge-blocks";

const base = ["a", "b", "c", "d", "e"];
const stable = (...blocks: string[]): Part => ({ kind: "stable", blocks });
const flat = (parts: Part[]) => parts.flatMap((part) => (part.kind === "stable" ? part.blocks : ["<conflict>"]));

// One test for each row of the table in section 6.3 of the design
describe("mergeBlocks", () => {
  it("takes the change when only one side changed a stretch", () => {
    expect(mergeBlocks(base, ["a", "B", "c", "d", "e"], base)).toEqual([stable("a", "B", "c", "d", "e")]);
    expect(mergeBlocks(base, base, ["a", "b", "c", "e"])).toEqual([stable("a", "b", "c", "e")]);
    expect(mergeBlocks(base, [...base, "f"], base)).toEqual([stable("a", "b", "c", "d", "e", "f")]);
  });

  it("takes a change that both sides made in the same way, once", () => {
    const both = ["a", "X", "c", "d", "e"];
    expect(mergeBlocks(base, both, both)).toEqual([stable("a", "X", "c", "d", "e")]);
    expect(mergeBlocks(base, ["a", "b", "d", "e"], ["a", "b", "d", "e"])).toEqual([stable("a", "b", "d", "e")]);
  });

  it("is a conflict when both sides changed the same block in different ways", () => {
    expect(mergeBlocks(base, ["a", "X", "c", "d", "e"], ["a", "Y", "c", "d", "e"])).toEqual([
      stable("a"),
      { kind: "conflict", base: ["b"], ours: ["X"], theirs: ["Y"] },
      stable("c", "d", "e"),
    ]);
  });

  it("is a conflict when one side deleted a block and the other changed it", () => {
    expect(mergeBlocks(base, ["a", "c", "d", "e"], ["a", "Y", "c", "d", "e"])).toEqual([
      stable("a"),
      { kind: "conflict", base: ["b"], ours: [], theirs: ["Y"] },
      stable("c", "d", "e"),
    ]);
  });

  it("keeps both when the two sides inserted at different places", () => {
    expect(mergeBlocks(base, ["a", "x", "b", "c", "d", "e"], ["a", "b", "c", "d", "y", "e"])).toEqual([stable("a", "x", "b", "c", "d", "y", "e")]);
  });

  it("is a conflict when the two sides inserted different blocks at the same place", () => {
    expect(mergeBlocks(base, ["a", "b", "x", "c", "d", "e"], ["a", "b", "y", "c", "d", "e"])).toEqual([
      stable("a", "b"),
      { kind: "conflict", base: [], ours: ["x"], theirs: ["y"] },
      stable("c", "d", "e"),
    ]);
  });

  it("takes an insertion that both sides made at the same place once", () => {
    expect(mergeBlocks(base, ["a", "x", "b", "c", "d", "e"], ["a", "x", "b", "c", "d", "e"])).toEqual([stable("a", "x", "b", "c", "d", "e")]);
  });

  it("treats a move as a deletion and an addition, so a move and an edit of the moved block conflict", () => {
    // Ours moves c to the front, theirs edits c where it was
    const parts = mergeBlocks(base, ["c", "a", "b", "d", "e"], ["a", "b", "C", "d", "e"]);
    expect(parts.some((part) => part.kind === "conflict")).toBe(true);
    // A move on its own is a deletion and an addition that the other side did not touch
    expect(flat(mergeBlocks(base, ["c", "a", "b", "d", "e"], base))).toEqual(["c", "a", "b", "d", "e"]);
  });

  it("keeps edits of two blocks next to each other, since they do not touch", () => {
    expect(mergeBlocks(base, ["a", "B", "c", "d", "e"], ["a", "b", "C", "d", "e"])).toEqual([stable("a", "B", "C", "d", "e")]);
  });

  it("keeps an insertion that sits next to an edit of the block after it, and puts the insertion first", () => {
    expect(mergeBlocks(base, ["a", "x", "b", "c", "d", "e"], ["a", "B", "c", "d", "e"])).toEqual([stable("a", "x", "B", "c", "d", "e")]);
  });

  it("is a conflict when an insertion lands inside a stretch that the other side deleted", () => {
    expect(mergeBlocks(base, ["a", "b", "c", "d", "e"].filter((block) => block !== "b" && block !== "c"), ["a", "b", "x", "c", "d", "e"]).some((part) => part.kind === "conflict")).toBe(true);
  });

  it("gives the base back when no one changed anything, and an empty document for three empty ones", () => {
    expect(mergeBlocks(base, base, base)).toEqual([stable(...base)]);
    expect(mergeBlocks([], [], [])).toEqual([]);
  });

  it("merges into an empty base, as when both sides add the same document", () => {
    expect(mergeBlocks([], ["x"], ["x"])).toEqual([stable("x")]);
    expect(mergeBlocks([], ["x"], ["y"])).toEqual([{ kind: "conflict", base: [], ours: ["x"], theirs: ["y"] }]);
  });
});
