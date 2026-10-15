import { describe, expect, it } from "@jest/globals";
import { CODE_LANGUAGES, languageLabel, lowlight } from "./code-languages";

describe("code languages", () => {
  it("every language in the picker is known to the highlighter", () => {
    const unknown = CODE_LANGUAGES.filter((language) => !lowlight.registered(language));
    expect(unknown).toEqual([]);
  });

  it("marks keywords and strings of Python", () => {
    const tree = lowlight.highlight("python", 'def f():\n    return "x"');
    const classes = JSON.stringify(tree);
    expect(classes).toContain("hljs-keyword");
    expect(classes).toContain("hljs-string");
  });

  it("has a readable name for every language", () => {
    expect(languageLabel("cpp")).toBe("C++");
    expect(languageLabel("unknown-lang")).toBe("unknown-lang");
    expect(CODE_LANGUAGES.every((language) => languageLabel(language) !== "")).toBe(true);
  });
});
