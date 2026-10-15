import { describe, expect, it } from "@jest/globals";
import { anchorFor, blockAt, spot } from "./preview-sync";

const anchors = [
  { id: "a:0", page: 2, y: 0 },
  { id: "a:1", page: 2, y: 100 },
  { id: "a:3", page: 3, y: 40 },
  { id: "b:0", page: 4, y: 0 },
];

describe("anchorFor", () => {
  it("finds the marker of a block", () => {
    expect(anchorFor(anchors, { documentId: "a", block: 1 })).toEqual({ id: "a:1", page: 2, y: 100 });
  });

  it("a block without a marker is shown where the block before it is", () => {
    expect(anchorFor(anchors, { documentId: "a", block: 2 })).toEqual({ id: "a:1", page: 2, y: 100 });
    expect(anchorFor(anchors, { documentId: "a", block: 9 })).toEqual({ id: "a:3", page: 3, y: 40 });
  });

  it("falls back to the block after when nothing is before, and to nothing for an unknown document", () => {
    expect(anchorFor([{ id: "a:2", page: 2, y: 5 }], { documentId: "a", block: 0 })).toEqual({ id: "a:2", page: 2, y: 5 });
    expect(anchorFor(anchors, { documentId: "zzz", block: 0 })).toBeNull();
  });

  it("an id with colons belongs to its last part", () => {
    expect(anchorFor([{ id: "x:y:4", page: 1, y: 1 }], { documentId: "x:y", block: 4 })?.page).toBe(1);
  });
});

describe("blockAt", () => {
  it("is the last marker at or above the point", () => {
    expect(blockAt(anchors, 2, 150)).toEqual({ documentId: "a", block: 1 });
    expect(blockAt(anchors, 3, 10)).toEqual({ documentId: "a", block: 1 });
    expect(blockAt(anchors, 3, 400)).toEqual({ documentId: "a", block: 3 });
    expect(blockAt(anchors, 9, 0)).toEqual({ documentId: "b", block: 0 });
  });

  it("is nothing above the first marker", () => {
    expect(blockAt(anchors, 1, 500)).toBeNull();
    expect(blockAt([], 1, 0)).toBeNull();
  });
});

describe("spot", () => {
  it("moves between the markers of a block and the next one on the same page", () => {
    expect(spot(anchors, { documentId: "a", block: 0 }, 0.5)).toEqual({ page: 2, y: 50 });
    expect(spot(anchors, { documentId: "a", block: 0 }, 2)).toEqual({ page: 2, y: 100 });
  });

  it("stays at the marker when the next block is on another page or the block has no marker of its own", () => {
    expect(spot(anchors, { documentId: "a", block: 1 }, 0.5)).toEqual({ page: 2, y: 100 });
    expect(spot(anchors, { documentId: "a", block: 2 }, 0.5)).toEqual({ page: 2, y: 100 });
    expect(spot(anchors, { documentId: "zzz", block: 0 }, 0.5)).toBeNull();
  });
});
