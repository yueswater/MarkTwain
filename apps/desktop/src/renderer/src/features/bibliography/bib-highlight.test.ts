import { describe, expect, it } from "@jest/globals";
import { tokenizeBibtex } from "./bib-highlight";

const kinds = (source: string) => tokenizeBibtex(source).map((t) => [t.kind, t.text]);

describe("tokenizeBibtex", () => {
  it("gives the source back when the tokens are joined, also for broken input", () => {
    const sources = [
      "% mine\n@article{wang2020,\n  author = {Wang, {X}},\n  year = 2020\n}\n\n@book{b, title = \"A {B} c\" # {d}}",
      "@article{open, title = {not closed",
      "text only",
      "",
      "@@@ {{{ }}} @a{",
      "@comment{ @article{x, y} }\n@string{a = \"b\"}",
    ];
    for (const source of sources) expect(tokenizeBibtex(source).map((t) => t.text).join("")).toBe(source);
  });

  it("colors the type, key, field names and values of an entry", () => {
    expect(kinds("@article{k,\n year = 2020,\n title = {T {x}}\n}")).toEqual([
      ["type", "@article"],
      ["punct", "{"],
      ["key", "k"],
      ["punct", ","],
      ["text", "\n "],
      ["field", "year"],
      ["text", " "],
      ["punct", "="],
      ["text", " "],
      ["number", "2020"],
      ["punct", ","],
      ["text", "\n "],
      ["field", "title"],
      ["text", " "],
      ["punct", "="],
      ["text", " "],
      ["string", "{T {x}}"],
      ["text", "\n"],
      ["punct", "}"],
    ]);
  });

  it("treats text between entries and the comment block as comments", () => {
    const result = kinds("% note\n@comment{ hidden }\n");
    expect(result[0]).toEqual(["comment", "% note"]);
    expect(result.some(([kind, text]) => kind === "comment" && text === " hidden ")).toBe(true);
  });

  it("reads quoted values with braces and concatenation", () => {
    const result = kinds('@misc{m, title = "A {x} b" # name}');
    expect(result.filter(([kind]) => kind === "string").map(([, text]) => text)).toEqual(['"A {x} b"', "name"]);
    expect(result.some(([kind, text]) => kind === "punct" && text === "#")).toBe(true);
  });

  it("keeps Chinese values and a key with punctuation", () => {
    const result = kinds("@book{wang:2020-a, author = {王小明}}");
    expect(result).toContainEqual(["key", "wang:2020-a"]);
    expect(result).toContainEqual(["string", "{王小明}"]);
  });
});
