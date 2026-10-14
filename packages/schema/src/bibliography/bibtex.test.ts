import { describe, expect, it } from "@jest/globals";
import {
  appendEntry,
  duplicateKeys,
  entryLabel,
  formatEntry,
  isValidBibKey,
  missingFields,
  parseBibtex,
  removeEntry,
  replaceEntry,
} from "./bibtex";

const SAMPLE = `% a comment
@article{wang2020,
  author = {Wang, Xiaoming and Lee, Jane},
  title  = {Deep {BERT} for "Chinese"},
  journal = "Journal of AI",
  year = 2020,
  pages = {1--10}
}

@string{jai = "Journal of AI"}

@book(chen2019,
  author = {Chen, Da},
  title = {A} # { Book},
  publisher = {Press},
  year = {2019},
)
`;

describe("parseBibtex", () => {
  it("reads entries, fields and positions", () => {
    const { entries, errors } = parseBibtex(SAMPLE);
    expect(errors).toEqual([]);
    expect(entries.map((e) => [e.type, e.key])).toEqual([
      ["article", "wang2020"],
      ["book", "chen2019"],
    ]);
    expect(entries[0]!.fields).toMatchObject({
      author: "Wang, Xiaoming and Lee, Jane",
      title: 'Deep {BERT} for "Chinese"',
      journal: "Journal of AI",
      year: "2020",
      pages: "1--10",
    });
    expect(SAMPLE.slice(entries[0]!.start, entries[0]!.end)).toMatch(/^@article\{wang2020[\s\S]*\}$/);
  });

  it("joins pieces and accepts round brackets", () => {
    const book = parseBibtex(SAMPLE).entries[1]!;
    expect(book.fields.title).toBe("A Book");
    expect(book.fields.year).toBe("2019");
  });

  it("skips comment string and preamble blocks", () => {
    const text = '@comment{@article{x, title={t}}}\n@preamble{"\\\\x"}\n@misc{m, title={ok}}';
    expect(parseBibtex(text).entries.map((e) => e.key)).toEqual(["m"]);
  });

  it("reports a broken entry with its line and keeps the others", () => {
    const text = "@article{a, title = {one}}\n\n@article{b,\n  title = {open\n";
    const result = parseBibtex(text);
    expect(result.entries.map((e) => e.key)).toEqual(["a"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.line).toBeGreaterThanOrEqual(3);
  });

  it("handles an empty file and text without entries", () => {
    expect(parseBibtex("")).toEqual({ entries: [], errors: [] });
    expect(parseBibtex("just words @ here")).toEqual({ entries: [], errors: [] });
  });

  it("keeps CJK values", () => {
    const text = "@book{cjk, author = {王小明}, title = {機器學習}, year = {2021}}";
    expect(parseBibtex(text).entries[0]!.fields.author).toBe("王小明");
  });
});

describe("editing the text", () => {
  it("replaces one entry and leaves the rest alone", () => {
    const first = parseBibtex(SAMPLE).entries[0]!;
    const next = replaceEntry(SAMPLE, first, formatEntry({ type: "article", key: "wang2020", fields: { title: "New", year: "2021" } }));
    expect(next.startsWith("% a comment\n@article{wang2020,")).toBe(true);
    expect(next).toContain("@string{jai");
    const again = parseBibtex(next).entries;
    expect(again[0]!.fields).toEqual({ title: "New", year: "2021" });
    expect(again[1]!.key).toBe("chen2019");
  });

  it("removes an entry with its blank line", () => {
    const first = parseBibtex(SAMPLE).entries[0]!;
    const next = removeEntry(SAMPLE, first);
    expect(parseBibtex(next).entries.map((e) => e.key)).toEqual(["chen2019"]);
    expect(next).not.toMatch(/\n\n\n/);
  });

  it("appends to an empty or an existing file", () => {
    const entry = { type: "misc", key: "k", fields: { title: "T" } };
    expect(appendEntry("", entry)).toBe("@misc{k,\n  title = {T}\n}\n");
    const text = appendEntry(SAMPLE, entry);
    expect(parseBibtex(text).entries.map((e) => e.key)).toEqual(["wang2020", "chen2019", "k"]);
  });
});

describe("formatEntry", () => {
  it("orders fields and drops empty ones", () => {
    const text = formatEntry({ type: "article", key: "a", fields: { year: "2020", note: "", journal: "J", author: "A", zeta: "z" } });
    expect(text).toBe("@article{a,\n  author  = {A},\n  journal = {J},\n  year    = {2020},\n  zeta    = {z}\n}");
  });

  it("round trips values with braces and unbalanced ones", () => {
    const fields = { title: "Deep {BERT} model", note: "open { brace" };
    const text = formatEntry({ type: "misc", key: "b", fields });
    const parsed = parseBibtex(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries[0]!.fields.title).toBe("Deep {BERT} model");
  });
});

describe("helpers", () => {
  it("labels an entry by author and year", () => {
    expect(entryLabel({ key: "k", fields: { author: "Wang, Xiaoming", year: "2020" } })).toBe("Wang, 2020");
    expect(entryLabel({ key: "k", fields: { author: "Wang, A and Lee, B", year: "2020" } })).toBe("Wang & Lee, 2020");
    expect(entryLabel({ key: "k", fields: { author: "A One and B Two and C Three", year: "2020" } })).toBe("One et al., 2020");
    expect(entryLabel({ key: "k", fields: {} })).toBe("k");
  });

  it("checks keys against the label prefixes", () => {
    expect(isValidBibKey("wang2020")).toBe(true);
    expect(isValidBibKey("a:b-c.d")).toBe(true);
    expect(isValidBibKey("fig:one")).toBe(false);
    expect(isValidBibKey("has space")).toBe(false);
    expect(isValidBibKey("")).toBe(false);
  });

  it("lists missing required fields", () => {
    expect(missingFields({ type: "article", fields: { author: "A", title: "T" } })).toEqual(["journal", "year"]);
    expect(missingFields({ type: "book", fields: { editor: "E", title: "T", publisher: "P", year: "1" } })).toEqual([]);
    expect(missingFields({ type: "unknown", fields: {} })).toEqual([]);
  });

  it("finds duplicate keys", () => {
    expect(duplicateKeys([{ key: "a" }, { key: "b" }, { key: "a" }, { key: "a" }])).toEqual(["a"]);
  });
});
