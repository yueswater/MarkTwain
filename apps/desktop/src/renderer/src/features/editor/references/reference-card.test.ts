import { describe, expect, it } from "@jest/globals";
import { entryCard, footnoteExcerpt, footnoteText, plainField } from "./reference-card";

describe("footnote text", () => {
  it("takes marks and dollar signs away and joins the spaces", () => {
    expect(footnoteText("A **bold** remark with $x^2$ and `code`.\n  Second line")).toBe("A bold remark with x^2 and code. Second line");
  });

  it("keeps a short footnote and cuts a long one with three dots", () => {
    expect(footnoteExcerpt("Short note.")).toBe("Short note.");
    const long = "字".repeat(300);
    const cut = footnoteExcerpt(long);
    expect(cut.endsWith("...")).toBe(true);
    expect(Array.from(cut)).toHaveLength(110 + 3);
  });

  it("counts a character outside the basic plane once", () => {
    expect(footnoteExcerpt("𠀀".repeat(10), 4)).toBe("𠀀𠀀𠀀𠀀...");
  });
});

describe("entryCard", () => {
  const entry = { key: "fu2006", author: "Fu", year: "2006", fields: { title: "{Contests} with \\emph{Two} Players \\& More", author: "Fu, Qiang and Lu, Jingfeng and Pan, Yuxin and Wang, Zhe", journal: "Journal of Economics" } };

  it("gives the title, the authors and year, and where it appeared, as plain text", () => {
    expect(entryCard(entry)).toEqual({
      title: "Contests with Two Players & More",
      byline: "Fu, Qiang; Lu, Jingfeng; Pan, Yuxin et al. · 2006",
      source: "Journal of Economics",
      untitled: false,
    });
  });

  it("falls back to the key and the short author text when the entry has little", () => {
    expect(entryCard({ key: "k1", author: "Lee", year: "2015", fields: {} })).toEqual({ title: "k1", byline: "Lee · 2015", source: "", untitled: true });
    expect(plainField(undefined)).toBe("");
  });
});
