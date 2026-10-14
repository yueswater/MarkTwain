import { describe, expect, it } from "@jest/globals";
import { matchSlash, slashMayOpen } from "./slash-match";
import { SLASH_ITEMS } from "./slash-items";

const names: Record<string, string> = { text: "Text", heading1: "Heading 1", displayMath: "Display formula", inlineMath: "Inline formula", table: "Table", figure: "Figure" };
const nameOf = (item: { id: string }) => names[item.id] ?? item.id;

describe("matchSlash", () => {
  it("lists every item when nothing is typed", () => {
    expect(matchSlash("", SLASH_ITEMS, nameOf)).toHaveLength(SLASH_ITEMS.length);
  });

  it("finds by name, by alias in both languages and ignores case and spaces", () => {
    expect(matchSlash("tab", SLASH_ITEMS, nameOf).map((i) => i.id)).toContain("table");
    expect(matchSlash("公式", SLASH_ITEMS, nameOf).map((i) => i.id)).toEqual(expect.arrayContaining(["displayMath", "inlineMath"]));
    expect(matchSlash("HEAD ING", SLASH_ITEMS, nameOf).map((i) => i.id)).toContain("heading1");
    expect(matchSlash("zzzz", SLASH_ITEMS, nameOf)).toEqual([]);
  });

  it("puts a name that starts with the text before one that only contains it", () => {
    const ids = matchSlash("form", SLASH_ITEMS, nameOf).map((i) => i.id);
    expect(ids.slice(0, 2).sort()).toEqual(["displayMath", "inlineMath"].sort());
  });

  it("every item has a unique id and a way to be found", () => {
    expect(new Set(SLASH_ITEMS.map((i) => i.id)).size).toBe(SLASH_ITEMS.length);
    for (const item of SLASH_ITEMS) expect(item.aliases.length).toBeGreaterThan(0);
  });
});

describe("slashMayOpen", () => {
  it("opens at the start and after a space, not inside a word or while composing", () => {
    expect(slashMayOpen("", false)).toBe(true);
    expect(slashMayOpen("hello ", false)).toBe(true);
    expect(slashMayOpen("and/or", false)).toBe(false);
    expect(slashMayOpen("", true)).toBe(false);
  });
});
