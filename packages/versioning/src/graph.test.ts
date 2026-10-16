import { describe, expect, it } from "@jest/globals";
import { ancestors, commonAncestor, isAncestor } from "./graph";
import type { Snapshot } from "./types";

const snap = (id: string, parentId: string | null, createdAt: number, parent2Id: string | null = null): Snapshot => ({ id, parentId, parent2Id, message: id, createdAt });
const graph = (...list: Snapshot[]) => new Map(list.map((s) => [s.id, s]));

//   r - a - b           main:  r a b m
//        \     \                       
//         c - d - m      work:  r a c d
describe("snapshot graph", () => {
  const g = graph(snap("r", null, 1), snap("a", "r", 2), snap("b", "a", 3), snap("c", "a", 4), snap("d", "c", 5), snap("m", "b", 6, "d"));

  it("lists a snapshot and everything before it, itself first", () => {
    expect(ancestors(g, "r")).toEqual(["r"]);
    expect(ancestors(g, "d")).toEqual(["d", "c", "a", "r"]);
    expect(new Set(ancestors(g, "m"))).toEqual(new Set(["m", "b", "d", "a", "c", "r"]));
  });

  it("finds the newest snapshot that two lines share", () => {
    expect(commonAncestor(g, "b", "d")).toBe("a");
    expect(commonAncestor(g, "b", "c")).toBe("a");
    expect(commonAncestor(g, "d", "m")).toBe("d");
    expect(commonAncestor(g, "m", "m")).toBe("m");
  });

  it("is null for lines that share nothing, and fails for a snapshot that does not exist", () => {
    expect(commonAncestor(graph(snap("x", null, 1), snap("y", null, 2)), "x", "y")).toBeNull();
    expect(() => ancestors(g, "nope")).toThrow(/nope/);
  });

  it("takes the later one when a merge was made both ways and there are two nearest", () => {
    // x and y were merged into each other, so both are ancestors of the two heads
    const crisscross = graph(snap("r", null, 1), snap("x", "r", 2), snap("y", "r", 3), snap("h1", "x", 4, "y"), snap("h2", "y", 5, "x"));
    expect(commonAncestor(crisscross, "h1", "h2")).toBe("y");
  });

  it("tells whether one snapshot is before another", () => {
    expect(isAncestor(g, "a", "m")).toBe(true);
    expect(isAncestor(g, "b", "d")).toBe(false);
    expect(isAncestor(g, "d", "d")).toBe(true);
  });
});
