import { describe, expect, it } from "@jest/globals";
import type { ConflictView } from "../../../../shared/ipc";
import { choicesFor, countResolved, isResolved, startingText } from "./merge-choices";

const blocks: ConflictView = { id: "d#0", type: "blocks", docId: "d", title: "One", kind: "chapter", position: 1, base: ["b"], ours: ["O"], theirs: ["T"] };
const field: ConflictView = { id: "d:title", type: "field", docId: "d", title: "One", kind: "chapter", position: 1, field: "title", base: "x", ours: "y", theirs: "z" };
const doc: ConflictView = { id: "d:document", type: "document", docId: "d", title: "One", kind: "chapter", position: 1, deletedBy: "ours" };

describe("merge choices", () => {
  it("offers what fits each kind of conflict", () => {
    expect(choicesFor(blocks)).toEqual(["ours", "theirs", "both", { text: "" }]);
    expect(choicesFor(field)).toEqual(["ours", "theirs"]);
    expect(choicesFor(doc)).toEqual(["keep", "delete"]);
  });

  it("counts a conflict as settled only by a choice that fits it", () => {
    expect(isResolved(blocks, undefined)).toBe(false);
    expect(isResolved(blocks, "both")).toBe(true);
    expect(isResolved(blocks, "keep")).toBe(false);
    expect(isResolved(field, "theirs")).toBe(true);
    expect(isResolved(field, "both")).toBe(false);
    expect(isResolved(doc, "delete")).toBe(true);
  });

  it("does not take an empty text of one's own for a choice", () => {
    expect(isResolved(blocks, { text: "" })).toBe(false);
    expect(isResolved(blocks, { text: "  \n" })).toBe(false);
    expect(isResolved(blocks, { text: "mine" })).toBe(true);
    expect(isResolved(field, { text: "mine" })).toBe(false);
  });

  it("counts how many are settled and starts a text of one's own from both sides", () => {
    expect(countResolved([blocks, field, doc], { "d#0": "ours", "d:title": "theirs" })).toBe(2);
    expect(countResolved([], {})).toBe(0);
    expect(startingText({ ...(blocks as Extract<ConflictView, { type: "blocks" }>), ours: ["a", "b"], theirs: ["c"] })).toBe("a\n\nb\n\nc");
  });
});
