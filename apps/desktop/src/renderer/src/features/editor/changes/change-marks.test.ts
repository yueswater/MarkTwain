import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { parseMarkdown } from "@marktwain/schema";
import { createSchemaExtensions } from "../extensions/schema-extensions";
import { computeChanges, editorBlocks, savedBlocks, savedPlainText } from "./change-marks";

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
