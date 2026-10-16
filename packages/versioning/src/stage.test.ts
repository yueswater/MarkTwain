import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { applySelection, listChanges } from "./stage";
import type { DocumentEntry, SnapshotContent } from "./types";

const doc = (blocks: string[], extra: Partial<DocumentEntry> = {}): DocumentEntry => ({ kind: "chapter", title: "One", position: 1, blocks, ...extra });
const content = (documents: Record<string, DocumentEntry>, files: Record<string, string> = {}): SnapshotContent => ({ documents, files });
const ids = (head: SnapshotContent, working: SnapshotContent) => listChanges(head, working).map((item) => item.id);
const all = (head: SnapshotContent, working: SnapshotContent) => new Set(ids(head, working));

describe("listChanges", () => {
  it("has nothing for two contents that are the same", () => {
    const same = content({ c1: doc(["a", "b"]) }, { "config.yml": "x" });
    expect(listChanges(same, same)).toEqual([]);
  });

  it("makes one item of each run of changed blocks, with what changed in it and not what stayed", () => {
    const head = content({ c1: doc(["a", "b", "c", "d", "e"]) });
    const working = content({ c1: doc(["a", "B", "c", "d", "E", "f"]) });
    expect(listChanges(head, working)).toEqual([
      { id: "hunk:c1:0", type: "hunk", docId: "c1", changes: [{ type: "modified", from: "b", to: "B" }] },
      { id: "hunk:c1:1", type: "hunk", docId: "c1", changes: [{ type: "modified", from: "e", to: "E" }, { type: "added", hash: "f" }] },
    ]);
  });

  it("lists a document that was added or taken away, the fields, and the files", () => {
    const head = content({ c1: doc(["a"]), c2: doc(["x"], { position: 2 }) }, { "a.png": "1", "b.png": "2" });
    const working = content({ c1: doc(["a"], { title: "Intro" }), c3: doc(["n"], { position: 3 }) }, { "a.png": "9", "c.png": "3" });
    expect(ids(head, working)).toEqual(["fields:c1", "doc:c2", "doc:c3", "file:a.png", "file:b.png", "file:c.png"]);
    expect(listChanges(head, working)[0]).toEqual({ id: "fields:c1", type: "fields", docId: "c1", fields: [{ field: "title", from: "One", to: "Intro" }] });
  });
});

describe("applySelection", () => {
  const head = content({ c1: doc(["a", "b", "c", "d", "e"]), c2: doc(["x"], { position: 2 }) }, { "config.yml": "cfg1", "old.png": "o" });
  const working = content({ c1: doc(["a", "B", "c", "d", "E"], { title: "Intro" }), c3: doc(["n"], { position: 3 }) }, { "config.yml": "cfg2", "new.png": "n" });

  it("takes every change when all are chosen, and none when none is", () => {
    expect(applySelection(head, working, all(head, working))).toEqual(working);
    expect(applySelection(head, working, new Set())).toEqual(head);
  });

  it("takes the chosen run of blocks and leaves the other as it is in the latest version", () => {
    const result = applySelection(head, working, new Set(["hunk:c1:1"]));
    expect(result.documents.c1?.blocks).toEqual(["a", "b", "c", "d", "E"]);
    expect(result.documents.c1?.title).toBe("One");
    expect(applySelection(head, working, new Set(["hunk:c1:0"])).documents.c1?.blocks).toEqual(["a", "B", "c", "d", "e"]);
  });

  it("takes the title and position of a document only when its fields are chosen", () => {
    expect(applySelection(head, working, new Set(["fields:c1"])).documents.c1).toMatchObject({ title: "Intro", blocks: ["a", "b", "c", "d", "e"] });
  });

  it("takes a document that was added and one that was taken away only when chosen", () => {
    const chosen = applySelection(head, working, new Set(["doc:c3", "doc:c2"]));
    expect(Object.keys(chosen.documents).sort()).toEqual(["c1", "c3"]);
    expect(Object.keys(applySelection(head, working, new Set()).documents).sort()).toEqual(["c1", "c2"]);
  });

  it("takes a file that was added, changed or taken away only when chosen", () => {
    expect(applySelection(head, working, new Set(["file:config.yml", "file:new.png"])).files).toEqual({ "config.yml": "cfg2", "old.png": "o", "new.png": "n" });
    expect(applySelection(head, working, new Set(["file:old.png"])).files).toEqual({ "config.yml": "cfg1" });
  });

  it("gives what is left over as changes after the version that was made", () => {
    const first = applySelection(head, working, new Set(["hunk:c1:0"]));
    expect(ids(first, working)).toEqual(["fields:c1", "hunk:c1:0", "doc:c2", "doc:c3", "file:config.yml", "file:new.png", "file:old.png"]);
  });
});

describe("choosing changes, by chance", () => {
  const entry = fc.record({ kind: fc.constantFrom("chapter", "abstract"), title: fc.constantFrom("", "A", "B"), position: fc.integer({ min: 1, max: 3 }), blocks: fc.array(fc.constantFrom("a", "b", "c", "d", "e", "f"), { maxLength: 9 }) });
  const value = fc.record({ documents: fc.dictionary(fc.constantFrom("d1", "d2", "d3"), entry), files: fc.dictionary(fc.constantFrom("x", "y", "z"), fc.constantFrom("1", "2", "3")) });

  it("gives the working content when everything is chosen and the latest version when nothing is", () => {
    fc.assert(
      fc.property(value, value, (head, working) => {
        expect(applySelection(head, working, all(head, working))).toEqual(working);
        expect(applySelection(head, working, new Set())).toEqual(head);
      }),
      { numRuns: 400 },
    );
  });

  it("leaves a version and the changes that were not chosen that add up to the working content", () => {
    fc.assert(
      fc.property(value, value, fc.array(fc.boolean(), { maxLength: 30 }), (head, working, picks) => {
        const items = ids(head, working);
        const chosen = new Set(items.filter((_item, index) => picks[index]));
        const first = applySelection(head, working, chosen);
        // What is left is exactly the changes that were not chosen, and taking them as well gives the working content
        expect(applySelection(first, working, all(first, working))).toEqual(working);
      }),
      { numRuns: 400 },
    );
  });
});
