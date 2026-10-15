import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { parseMarkdown } from "@marktwain/schema";
import { createSchemaExtensions } from "./schema-extensions";
import { inlineOf } from "./block-drop";

const schema = getSchema(createSchemaExtensions());
const first = (md: string) => schema.nodeFromJSON(parseMarkdown(md)).firstChild!;

describe("inlineOf", () => {
  it("takes the text of a paragraph, a heading and a list item with one paragraph", () => {
    expect(inlineOf(first("Some **bold** text"), schema)?.textBetween(0, 14)).toBe("Some bold text");
    expect(inlineOf(first("## Title"), schema)?.textBetween(0, 5)).toBe("Title");
    expect(inlineOf(first("- item"), schema)).toBeNull();
    expect(inlineOf(first("- item").firstChild!, schema)?.textBetween(0, 4)).toBe("item");
  });

  it("turns a display formula into an inline one", () => {
    const content = inlineOf(first("$$\nx^2\n$$"), schema);
    expect(content?.firstChild?.type.name).toBe("inlineMath");
    expect(content?.firstChild?.attrs.latex).toBe("x^2");
  });

  it("has nothing for a code block or a callout", () => {
    expect(inlineOf(first("```\ncode\n```"), schema)).toBeNull();
    expect(inlineOf(first("::: {.theorem}\nText\n:::"), schema)).toBeNull();
  });
});
