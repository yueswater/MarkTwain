import { describe, expect, it } from "@jest/globals";
import { defaultHeading, defaultText, isDefaultText, isUntouched } from "./default-headings";

describe("default headings", () => {
  it("gives the first chapter its own title and the others another, in the language of the thesis", () => {
    expect(defaultHeading("chapter", 1, "chinese")).toBe("緒論");
    expect(defaultHeading("chapter", 2, "chinese")).toBe("新的一章");
    expect(defaultHeading("chapter", 1, "english")).toBe("Introduction");
    expect(defaultHeading("chapter", 3, "english")).toBe("New chapter");
    expect(defaultHeading("appendix", 1, "english")).toBe("New appendix");
  });

  it("writes it as a first level heading, and gives nothing to a kind without a heading of its own", () => {
    expect(defaultText("chapter", 1, "chinese")).toBe("# 緒論\n");
    for (const kind of ["abstract", "abstractEn", "acknowledgement", "denotation"]) expect(defaultText(kind, 1, "chinese")).toBe("");
  });

  it("falls back to Chinese for a language that it does not know", () => {
    expect(defaultText("chapter", 1, "klingon")).toBe("# 緒論\n");
  });

  it("knows a text that nobody has written in, and only that", () => {
    expect(isUntouched("chapter", "# 緒論\n", "chinese")).toBe(true);
    expect(isUntouched("chapter", "# 緒論\n", "english")).toBe(false);
    expect(isUntouched("chapter", "# 緒論\n\n內文\n", "chinese")).toBe(false);
    expect(isUntouched("abstract", "", "chinese")).toBe(false);
    expect(isDefaultText("chapter", "# Introduction\n")).toBe(true);
    expect(isDefaultText("appendix", "# 新的附錄\n")).toBe(true);
    expect(isDefaultText("chapter", "# 研究動機\n")).toBe(false);
  });
});
