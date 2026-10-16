import { describe, expect, it } from "@jest/globals";
import { resolveMerge, threeWayMerge, UnresolvedConflictError } from "./merge";
import type { DocumentEntry, SnapshotContent } from "./types";

const doc = (blocks: string[], extra: Partial<DocumentEntry> = {}): DocumentEntry => ({ kind: "chapter", title: "One", position: 0, blocks, ...extra });
const content = (documents: Record<string, DocumentEntry>, files: Record<string, string> = {}): SnapshotContent => ({ documents, files });

const base = content({ c1: doc(["a", "b", "c"]), abs: doc(["x"], { kind: "abstract" }) }, { "config.yml": "cfg1" });

describe("threeWayMerge of documents", () => {
  it("is the same content when nobody changed anything, and when both sides are the same change", () => {
    expect(threeWayMerge(base, base, base).content).toEqual(base);
    const changed = content({ c1: doc(["a", "B", "c"]), abs: doc(["x"], { kind: "abstract" }) }, { "config.yml": "cfg1" });
    expect(threeWayMerge(base, changed, changed).content).toEqual(changed);
    expect(threeWayMerge(changed, changed, changed).content).toEqual(changed);
  });

  it("takes the change of the side that made one, whichever it is", () => {
    const edited = content({ c1: doc(["a", "B", "c"]), abs: doc(["x"], { kind: "abstract" }) }, { "config.yml": "cfg1" });
    expect(threeWayMerge(base, edited, base).content).toEqual(edited);
    expect(threeWayMerge(base, base, edited).content).toEqual(edited);
  });

  it("merges changes to different blocks of a document and to different documents", () => {
    const ours = content({ c1: doc(["A", "b", "c"]), abs: doc(["x"], { kind: "abstract" }) }, { "config.yml": "cfg1" });
    const theirs = content({ c1: doc(["a", "b", "C"]), abs: doc(["x", "y"], { kind: "abstract" }) }, { "config.yml": "cfg1" });
    expect(threeWayMerge(base, ours, theirs).content).toEqual(content({ c1: doc(["A", "b", "C"]), abs: doc(["x", "y"], { kind: "abstract" }) }, { "config.yml": "cfg1" }));
  });

  it("lists a conflict of blocks with the three versions of the stretch and keeps the rest merged", () => {
    const ours = content({ c1: doc(["a", "X", "c"]), abs: base.documents.abs! }, base.files);
    const theirs = content({ c1: doc(["a", "Y", "c"]), abs: doc(["x", "y"], { kind: "abstract" }) }, base.files);
    const result = threeWayMerge(base, ours, theirs);
    expect(result.content).toBeNull();
    expect(result.draft.conflicts).toEqual([{ id: "c1#0", type: "blocks", docId: "c1", base: ["b"], ours: ["X"], theirs: ["Y"] }]);
    expect(result.draft.documents.abs?.parts).toEqual([{ kind: "stable", blocks: ["x", "y"] }]);
  });

  it("adds a document that one side added, and takes one away that the other side did not touch", () => {
    const ours = content({ ...base.documents, c2: doc(["n"], { title: "Two", position: 1 }) }, base.files);
    const theirs = content({ c1: base.documents.c1! }, base.files);
    const merged = threeWayMerge(base, ours, theirs).content!;
    expect(Object.keys(merged.documents).sort()).toEqual(["c1", "c2"]);
  });

  it("is a conflict when one side deleted a document that the other changed, and the choice decides", () => {
    const ours = content({ c1: base.documents.c1! }, base.files);
    const theirs = content({ c1: base.documents.c1!, abs: doc(["x", "more"], { kind: "abstract" }) }, base.files);
    const result = threeWayMerge(base, ours, theirs);
    expect(result.draft.conflicts).toEqual([{ id: "abs:document", type: "document", docId: "abs", deletedBy: "ours" }]);
    expect(Object.keys(resolveMerge(result.draft, { "abs:document": "keep" }).documents).sort()).toEqual(["abs", "c1"]);
    expect(Object.keys(resolveMerge(result.draft, { "abs:document": "delete" }).documents)).toEqual(["c1"]);
  });

  it("merges the title and the position as single values", () => {
    const ours = content({ c1: doc(["a", "b", "c"], { title: "Intro" }), abs: base.documents.abs! }, base.files);
    const theirs = content({ c1: doc(["a", "b", "c"], { position: 3 }), abs: base.documents.abs! }, base.files);
    expect(threeWayMerge(base, ours, theirs).content?.documents.c1).toEqual(doc(["a", "b", "c"], { title: "Intro", position: 3 }));
    const clash = content({ c1: doc(["a", "b", "c"], { title: "Preface" }), abs: base.documents.abs! }, base.files);
    const result = threeWayMerge(base, ours, clash);
    expect(result.draft.conflicts).toEqual([{ id: "c1:title", type: "field", docId: "c1", field: "title", base: "One", ours: "Intro", theirs: "Preface" }]);
    expect(resolveMerge(result.draft, { "c1:title": "theirs" }).documents.c1?.title).toBe("Preface");
  });
});

describe("threeWayMerge of files", () => {
  it("takes the change of one side and an addition, and drops a file that one side deleted and the other left", () => {
    const ours = content(base.documents, { "config.yml": "cfg2", "refs.bib": "bib1" });
    expect(threeWayMerge(base, ours, base).content?.files).toEqual({ "config.yml": "cfg2", "refs.bib": "bib1" });
    expect(threeWayMerge(base, content(base.documents, {}), base).content?.files).toEqual({});
  });

  it("is a conflict when both sides changed a file in different ways, or one deleted what the other changed", () => {
    const ours = content(base.documents, { "config.yml": "cfg2" });
    const theirs = content(base.documents, { "config.yml": "cfg3" });
    const clash = threeWayMerge(base, ours, theirs);
    expect(clash.draft.conflicts).toEqual([{ id: "file:config.yml", type: "file", path: "config.yml", base: "cfg1", ours: "cfg2", theirs: "cfg3" }]);
    expect(resolveMerge(clash.draft, { "file:config.yml": "theirs" }).files).toEqual({ "config.yml": "cfg3" });
    const deleted = threeWayMerge(base, content(base.documents, {}), ours);
    expect(deleted.draft.conflicts[0]).toMatchObject({ type: "file", ours: null, theirs: "cfg2" });
    expect(resolveMerge(deleted.draft, { "file:config.yml": "ours" }).files).toEqual({});
  });
});

describe("resolveMerge", () => {
  const ours = content({ c1: doc(["a", "X", "c"]) });
  const theirs = content({ c1: doc(["a", "Y", "c"]) });
  const result = threeWayMerge(content({ c1: doc(["a", "b", "c"]) }), ours, theirs);

  it("writes nothing until every conflict has a choice", () => {
    expect(() => resolveMerge(result.draft, {})).toThrow(UnresolvedConflictError);
    expect(() => resolveMerge(result.draft, {})).toThrow(/c1#0/);
  });

  it("takes the main line, the change that comes in, the base, both one after the other, or blocks of its own", () => {
    const blocks = (choice: Parameters<typeof resolveMerge>[1][string]) => resolveMerge(result.draft, { "c1#0": choice }).documents.c1?.blocks;
    expect(blocks("ours")).toEqual(["a", "X", "c"]);
    expect(blocks("theirs")).toEqual(["a", "Y", "c"]);
    expect(blocks("base")).toEqual(["a", "b", "c"]);
    expect(blocks("both")).toEqual(["a", "X", "Y", "c"]);
    expect(blocks({ blocks: ["a", "Z", "c"].slice(1, 2) })).toEqual(["a", "Z", "c"]);
  });

  it("refuses a choice that does not fit the conflict", () => {
    expect(() => resolveMerge(result.draft, { "c1#0": "keep" })).toThrow();
  });
});
