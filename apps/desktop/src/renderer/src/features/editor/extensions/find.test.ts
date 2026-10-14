import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { parseMarkdown } from "@marktwain/schema";
import { createSchemaExtensions } from "./schema-extensions";
import { findMatches } from "./find";

const schema = getSchema(createSchemaExtensions());
const doc = (md: string) => schema.nodeFromJSON(parseMarkdown(md));
const texts = (md: string, term: string, caseSensitive = false) => {
  const d = doc(md);
  return findMatches(d, term, caseSensitive).map((m) => d.textBetween(m.from, m.to));
};

describe("findMatches", () => {
  it("finds every match, ignoring case unless asked", () => {
    expect(texts("Gradient 與 gradient 與 GRADIENT", "gradient")).toEqual(["Gradient", "gradient", "GRADIENT"]);
    expect(texts("Gradient 與 gradient", "gradient", true)).toEqual(["gradient"]);
  });

  it("matches text that marks split into pieces", () => {
    expect(texts("這是**重**點內容", "重點")).toEqual(["重點"]);
  });

  it("does not match across blocks or over an inline formula", () => {
    expect(texts("abc\n\ndef", "cd")).toEqual([]);
    expect(texts("ab $x$ cd", "b c")).toEqual([]);
  });

  it("finds matches in table cells, lists and headings, and nothing for an empty term", () => {
    expect(texts("# 找標題\n\n- 找清單\n\n| 找表格 |\n| --- |\n", "找")).toHaveLength(3);
    expect(texts("abc", "")).toEqual([]);
  });

  it("gives the document positions so the match can be selected", () => {
    const d = doc("前文 重點 後文");
    const [match] = findMatches(d, "重點", false);
    expect(d.textBetween(match!.from, match!.to)).toBe("重點");
    expect(match!.to - match!.from).toBe(2);
  });
});
