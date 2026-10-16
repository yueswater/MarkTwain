import { describe, expect, it } from "@jest/globals";
import { diffBlocks, diffContent } from "./diff";

describe("diffBlocks", () => {
  it("marks what was added, removed and replaced, and keeps what stayed", () => {
    expect(diffBlocks(["a", "b", "c"], ["a", "b", "c"])).toEqual([{ type: "same", hash: "a" }, { type: "same", hash: "b" }, { type: "same", hash: "c" }]);
    expect(diffBlocks(["a", "b"], ["a", "x", "b"])).toEqual([{ type: "same", hash: "a" }, { type: "added", hash: "x" }, { type: "same", hash: "b" }]);
    expect(diffBlocks(["a", "b", "c"], ["a", "c"])).toEqual([{ type: "same", hash: "a" }, { type: "removed", hash: "b" }, { type: "same", hash: "c" }]);
    expect(diffBlocks(["a", "b", "c"], ["a", "B", "c"])).toEqual([{ type: "same", hash: "a" }, { type: "modified", from: "b", to: "B" }, { type: "same", hash: "c" }]);
  });

  it("pairs a replaced run block by block and adds or removes the rest", () => {
    expect(diffBlocks(["a", "b", "c"], ["a", "X", "Y", "Z"])).toEqual([
      { type: "same", hash: "a" },
      { type: "modified", from: "b", to: "X" },
      { type: "modified", from: "c", to: "Y" },
      { type: "added", hash: "Z" },
    ]);
  });
});

describe("diffContent", () => {
  const from = { documents: { c1: { kind: "chapter", title: "One", position: 0, blocks: ["a"] }, c2: { kind: "chapter", title: "Two", position: 1, blocks: ["b"] } }, files: { "config.yml": "1", "old.png": "2" } };
  it("lists the documents and files that differ and leaves out the same ones", () => {
    const to = { documents: { c1: { kind: "chapter", title: "Intro", position: 0, blocks: ["a", "n"] }, c3: { kind: "chapter", title: "Three", position: 2, blocks: [] } }, files: { "config.yml": "9", "new.png": "3" } };
    const diff = diffContent(from, to);
    expect(diff.documents.map((d) => [d.docId, d.status])).toEqual([["c1", "changed"], ["c2", "removed"], ["c3", "added"]]);
    expect(diff.documents[0]?.fields).toEqual([{ field: "title", from: "One", to: "Intro" }]);
    expect(diff.files).toEqual([{ path: "config.yml", status: "changed" }, { path: "new.png", status: "added" }, { path: "old.png", status: "removed" }]);
    expect(diffContent(from, from)).toEqual({ documents: [], files: [] });
  });
});

describe("the sequence entry point", () => {
  it("has what the front end needs and none of the hashing", async () => {
    const sequence = await import("./sequence");
    expect(Object.keys(sequence).sort()).toEqual(["align", "applyHunks", "diffBlocks", "hunksBetween"]);
  });
});
