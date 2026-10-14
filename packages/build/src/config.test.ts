import { describe, expect, it } from "@jest/globals";
import { completeConfig } from "./config";

describe("completeConfig", () => {
  it("fills absent fields and lists them", () => {
    const { text, missing } = completeConfig('title: "題目"\nschool: ntu\n', "2026-10-14");
    expect(missing).toContain("author");
    expect(missing).toContain("date");
    expect(missing).toContain("keywords");
    expect(missing).not.toContain("title");
    expect(text).toContain("school: ntu");
    expect(text).toContain("date: 2026-10-14");
  });

  it("leaves a complete config untouched", () => {
    const full = [
      ...["title", "title-en", "author", "author-en", "id", "advisor", "advisor-en", "college", "college-en", "institute", "institute-en", "degree", "degree-en", "type", "type-en"].map((k) => `${k}: x`),
      "date: 2026-01-02",
      "oral-date: 2026-01-03",
      "keywords: [a]",
      "keywords-en: [b]",
    ].join("\n");
    expect(completeConfig(full, "2026-10-14").missing).toEqual([]);
  });

  it("treats a malformed date as missing", () => {
    expect(completeConfig("date: tomorrow\n", "2026-10-14").text).toContain("date: 2026-10-14");
  });
});
