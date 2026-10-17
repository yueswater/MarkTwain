import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { parseMarkdown } from "@marktwain/schema";
import { createSchemaExtensions } from "../extensions/schema-extensions";
import { EditorState } from "@tiptap/pm/state";
import { computeChanges, editorBlocks, revertChange, savedBlocks, savedPlainText } from "./change-marks";

const schema = getSchema(createSchemaExtensions());
const doc = (markdown: string) => schema.nodeFromJSON(parseMarkdown(markdown));

describe("computeChanges", () => {
  it("has no marks for the same blocks", () => {
    expect(computeChanges(["a", "b"], ["a", "b"])).toEqual([]);
  });

  it("marks an added block by its place in the editor", () => {
    expect(computeChanges(["a", "c"], ["a", "b", "c"])).toEqual([{ type: "added", index: 1 }]);
    expect(computeChanges([], ["a", "b"])).toEqual([{ type: "added", index: 0 }, { type: "added", index: 1 }]);
  });

  it("marks a removed block before the block that follows it, or at the end", () => {
    expect(computeChanges(["a", "b", "c"], ["a", "c"])).toEqual([{ type: "removed", at: 1, before: "b" }]);
    expect(computeChanges(["a", "b"], ["a"])).toEqual([{ type: "removed", at: 1, before: "b" }]);
  });

  it("marks a replaced block as modified, with the old text", () => {
    expect(computeChanges(["a", "b", "c"], ["a", "B", "c"])).toEqual([{ type: "modified", index: 1, before: "b" }]);
  });

  it("counts the blocks of the editor, not of the old text, for the places", () => {
    expect(computeChanges(["a", "b", "c", "d"], ["a", "X", "d", "e"])).toEqual([
      { type: "modified", index: 1, before: "b" },
      { type: "removed", at: 2, before: "c" },
      { type: "added", index: 3 },
    ]);
  });
});

describe("the blocks as Markdown", () => {
  const text = "# Title\n\nFirst paragraph with **bold**.\n\n- one\n- two\n\n$$\nx^2\n$$\n";

  it("gives the same texts for the saved text and for the editor that holds it, so that nothing is marked", () => {
    expect(editorBlocks(doc(text))).toEqual(savedBlocks(text));
    expect(computeChanges(savedBlocks(text), editorBlocks(doc(text)))).toEqual([]);
  });

  it("sees a typed change in the one block that holds it", () => {
    const edited = text.replace("First paragraph", "First short paragraph");
    expect(computeChanges(savedBlocks(text), editorBlocks(doc(edited)))).toEqual([{ type: "modified", index: 1, before: expect.stringContaining("First paragraph") }]);
  });

  it("gives the plain text of a paragraph and of a heading, and nothing for the other blocks", () => {
    expect(savedPlainText("First paragraph with **bold**.")).toBe("First paragraph with bold.");
    expect(savedPlainText("## A heading")).toBe("A heading");
    expect(savedPlainText("- one\n- two")).toBeNull();
    expect(savedPlainText("$$\nx^2\n$$")).toBeNull();
  });
});

describe("revertChange", () => {
  const saved = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph.\n";

  /** The editor text after the change that the first mark of the comparison with `saved` asks to put back, and the marks that are left. */
  const revertFirst = (edited: string, which = 0) => {
    const state = EditorState.create({ doc: doc(edited) });
    const marks = computeChanges(savedBlocks(saved), editorBlocks(state.doc));
    const tr = state.tr;
    expect(revertChange(tr, marks[which]!)).toBe(true);
    return { text: editorBlocks(tr.doc).join("").trim(), left: computeChanges(savedBlocks(saved), editorBlocks(tr.doc)) };
  };

  it("takes away a block that was added", () => {
    const { text, left } = revertFirst(saved.replace("Second paragraph.", "A new one.\n\nSecond paragraph."));
    expect(text).toBe(editorBlocks(doc(saved)).join("").trim());
    expect(left).toEqual([]);
  });

  it("puts the old block back in place of one that was changed", () => {
    const { text, left } = revertFirst(saved.replace("Second paragraph.", "Second paragraph, changed."));
    expect(text).toBe(editorBlocks(doc(saved)).join("").trim());
    expect(left).toEqual([]);
  });

  it("puts a block that was taken away back where it was, also at the end", () => {
    expect(revertFirst(saved.replace("Second paragraph.\n\n", "")).left).toEqual([]);
    expect(revertFirst(saved.replace("\n\nThird paragraph.", "")).left).toEqual([]);
  });

  it("reverts one change and leaves the others marked", () => {
    const edited = saved.replace("First paragraph.", "First, changed.").replace("Third paragraph.", "Third paragraph.\n\nAdded last.");
    const { left } = revertFirst(edited, 0);
    expect(left).toEqual([{ type: "added", index: 4 }]);
  });

  it("empties the only block instead of leaving a document without one", () => {
    const state = EditorState.create({ doc: doc("Only") });
    const tr = state.tr;
    expect(revertChange(tr, { type: "added", index: 0 })).toBe(true);
    expect(tr.doc.childCount).toBe(1);
    expect(tr.doc.textContent).toBe("");
  });
});

describe("computeChanges, blank blocks", () => {
  it("shows no removed block for a blank one, a new project starts with one that is replaced by the first text", () => {
    expect(computeChanges(["\n"], ["你好\n"]).filter((mark) => mark.type === "removed")).toEqual([]);
    expect(computeChanges(["\n"], ["你好\n"])).toEqual([{ type: "added", index: 0 }]);
  });

  it("still shows a block with text that is removed or replaced", () => {
    expect(computeChanges(["甲\n"], []).map((mark) => mark.type)).toEqual(["removed"]);
    expect(computeChanges(["甲\n"], ["乙\n"]).map((mark) => mark.type)).toEqual(["modified"]);
  });
});
