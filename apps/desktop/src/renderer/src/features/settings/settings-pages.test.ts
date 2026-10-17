import { describe, expect, it } from "@jest/globals";
import { ADVANCED_FIELDS } from "@marktwain/schema";
import { SETTING_ENTRIES, SETTINGS_PAGES, pageOf, pageOfGroup, searchSettings } from "./settings-pages";

describe("settings pages", () => {
  it("shows every group of the format settings on exactly one page", () => {
    const groups = [...new Set(ADVANCED_FIELDS.map((field) => field.group))];
    for (const group of groups) {
      expect(SETTINGS_PAGES.filter((page) => page.groups.includes(group))).toHaveLength(1);
      expect(pageOfGroup(group)).not.toBeNull();
    }
  });

  it("lists every format setting once, so none is left out or appears twice", () => {
    const ids = SETTING_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const field of ADVANCED_FIELDS) expect(ids).toContain(`setting-${field.path}`);
  });

  it("keeps the thesis pages in the thesis section and asks for a project only there", () => {
    for (const page of SETTINGS_PAGES) expect(page.needsProject).toBe(page.section === "thesis");
  });

  it("falls back to the first page for an unknown id", () => {
    expect(pageOf("nope").id).toBe(SETTINGS_PAGES[0]!.id);
  });
});

describe("searchSettings", () => {
  const label = (entry: { key: string }) => entry.key;

  it("finds a setting by part of its label and returns its page", () => {
    const found = searchSettings("Margin", (entry) => label(entry));
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((result) => result.entry.page === "thesisPage")).toBe(true);
  });

  it("ignores case and spaces and returns nothing for an empty query", () => {
    expect(searchSettings("  ", label)).toEqual([]);
    expect(searchSettings("font-size", label).length).toBeGreaterThan(0);
    expect(searchSettings("FONT - SIZE", label).length).toBeGreaterThan(0);
  });
});

describe("searchSettings, the words of a page", () => {
  const label = (entry: { key: string }) => entry.key;
  const words = (entry: { page: string }) => (entry.page === "thesisCaptions" ? "圖名,表名,圖說" : entry.page === "thesisPageNumber" ? "目次,目錄" : "");

  it("finds a page by a word that is not in its name", () => {
    const found = searchSettings("圖說", label, words);
    expect(found.map((result) => result.entry.id)).toEqual(["page-thesisCaptions"]);
    expect(searchSettings("目錄", label, words).map((result) => result.entry.page)).toEqual(["thesisPageNumber"]);
  });

  it("does not list every setting of the page for such a word", () => {
    expect(searchSettings("表名", label, words)).toHaveLength(1);
  });

  it("finds a page by its own name", () => {
    expect(searchSettings("page.thesisPage.title", label).map((result) => result.entry.id)).toContain("page-thesisPage");
  });
});
