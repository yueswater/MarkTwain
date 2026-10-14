import { describe, expect, it } from "@jest/globals";
import { detectFormat, importCslJson, importEntries, importHayagriva } from "./import";

describe("importCslJson", () => {
  it("converts items", () => {
    const source = JSON.stringify([
      {
        id: "wang2020",
        type: "article-journal",
        title: "Deep learning",
        author: [{ family: "Wang", given: "Xiaoming" }, { literal: "OpenAI Team" }],
        "container-title": "Journal of AI",
        issued: { "date-parts": [[2020, 5]] },
        page: "1-10",
        DOI: "10.1/x",
      },
      { id: "thesis1", type: "thesis", title: "T", publisher: "NTU", issued: { raw: "c. 2019" } },
      { type: "book" },
    ]);
    const { entries, errors } = importCslJson(source);
    expect(errors).toEqual(["item without id"]);
    expect(entries[0]).toEqual({
      type: "article",
      key: "wang2020",
      fields: {
        author: "Wang, Xiaoming and {OpenAI Team}",
        title: "Deep learning",
        year: "2020",
        pages: "1--10",
        doi: "10.1/x",
        journal: "Journal of AI",
      },
    });
    expect(entries[1]).toMatchObject({ type: "phdthesis", fields: { school: "NTU", year: "2019" } });
  });

  it("accepts one item and reports broken JSON", () => {
    expect(importCslJson('{"id":"a","type":"book","title":"B"}').entries).toHaveLength(1);
    expect(importCslJson("nope").errors).toEqual(["invalid JSON"]);
  });
});

describe("importHayagriva", () => {
  it("converts entries", () => {
    const source = `
wang2020:
  type: article
  title: Deep learning
  author: ["Wang, Xiaoming", "Lee, Jane"]
  date: 2020-05-01
  page-range: 1-10
  parent:
    type: periodical
    title: Journal of AI
    volume: 3
bad: just text
`;
    const { entries, errors } = importHayagriva(source);
    expect(errors).toEqual(["bad"]);
    expect(entries).toEqual([
      {
        type: "article",
        key: "wang2020",
        fields: {
          author: "Wang, Xiaoming and Lee, Jane",
          title: "Deep learning",
          year: "2020",
          pages: "1--10",
          journal: "Journal of AI",
          volume: "3",
        },
      },
    ]);
  });

  it("rejects text that is not a mapping", () => {
    expect(importHayagriva("- a\n- b").errors).toEqual(["not a mapping"]);
  });
});

describe("format detection and dispatch", () => {
  it("uses the extension first and the content after", () => {
    expect(detectFormat("a.bib", "")).toBe("bibtex");
    expect(detectFormat("a.json", "")).toBe("csl-json");
    expect(detectFormat("a.yml", "")).toBe("hayagriva");
    expect(detectFormat("a.txt", "@book{a}")).toBe("bibtex");
    expect(detectFormat("a.txt", " [ ]")).toBe("csl-json");
    expect(detectFormat("a.txt", "k:\n  type: book")).toBe("hayagriva");
  });

  it("reads BibTeX through the same entry point", () => {
    const result = importEntries("bibtex", "@misc{m, title={ok}}\n@misc{b,\n title={x");
    expect(result.entries.map((e) => e.key)).toEqual(["m"]);
    expect(result.errors).toHaveLength(1);
  });
});
