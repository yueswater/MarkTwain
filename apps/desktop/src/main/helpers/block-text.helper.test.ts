import { describe, expect, it } from "@jest/globals";
import { blockText } from "./block-text.helper";

describe("blockText", () => {
  it("blockText joins table cells and list items with spaces", () => {
    expect(blockText({ type: "tableRow", content: [{ type: "tableCell", content: [{ text: "甲" }] }, { type: "tableCell", content: [{ text: "乙" }] }] })).toBe("甲  乙");
  });
});
