import { describe, expect, it } from "@jest/globals";
import { defaultFields } from "@marktwain/schema";
import { missingForSubmission } from "./export-check";

describe("missingForSubmission", () => {
  it("lists every field of a new project, in the order of the form", () => {
    expect(missingForSubmission({ ...defaultFields(), title: "論文" })).toEqual([
      "titleEn", "author", "authorEn", "id", "advisor", "advisorEn", "college", "institute", "date", "oralDate", "keywords", "keywordsEn",
    ]);
  });

  it("lists nothing when everything is filled in, and counts spaces and empty lists as nothing", () => {
    const full = {
      ...defaultFields(),
      title: "a", titleEn: "a", author: "a", authorEn: "a", id: "1", advisor: "a", advisorEn: "a", college: "a", institute: "a", degree: "碩士",
      date: "2026-06-30", oralDate: "2026-06-15", keywords: ["甲"], keywordsEn: ["a"],
    };
    expect(missingForSubmission(full)).toEqual([]);
    expect(missingForSubmission({ ...full, author: "   ", keywords: [] })).toEqual(["author", "keywords"]);
  });
});
