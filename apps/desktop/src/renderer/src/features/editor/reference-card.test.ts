import { describe, expect, it } from "@jest/globals";
import { footnoteExcerpt, footnoteText } from "./reference-card";

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
