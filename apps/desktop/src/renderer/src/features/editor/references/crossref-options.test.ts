import { describe, expect, it } from "@jest/globals";
import { buildRefOptions, kindsWithTargets, refKindOfLabel } from "./crossref-options";

const name = (kind: string) => ({ cha: "Chapter", sec: "Section", fig: "Figure", tbl: "Table", eq: "Eq", lst: "Listing" })[kind] ?? kind;

describe("refKindOfLabel", () => {
  it("maps a label prefix to the kind of the left field", () => {
    expect(refKindOfLabel("cha:a")).toBe("heading");
    expect(refKindOfLabel("sec:a")).toBe("heading");
    expect(refKindOfLabel("fig:a")).toBe("figure");
    expect(refKindOfLabel("tbl:a")).toBe("table");
    expect(refKindOfLabel("eq:a")).toBe("formula");
    expect(refKindOfLabel("lst:a")).toBe("code");
    expect(refKindOfLabel("nothing")).toBeNull();
  });
});

describe("buildRefOptions", () => {
  it("groups labeled and unlabeled targets by kind and cuts long formulas", () => {
    const long = String.raw`x_{I}^{\text{IU}} (v_{H}) > x_{I}^{\text{UI}} (v_{H}) > x_{I}^{\text{SS}} (v_{H})`;
    const options = buildRefOptions(
      [{ label: "fig:one", kind: "fig", display: "1.1", documentId: "d" }],
      [
        { pos: 5, kind: "eq", text: long },
        { pos: 9, kind: "sec", text: "Motivation" },
      ],
      name,
    );
    expect(options.map((o) => [o.kind, o.labeled])).toEqual([
      ["figure", true],
      ["formula", false],
      ["heading", false],
    ]);
    expect(options[1]!.text.endsWith("...")).toBe(true);
    expect(options[1]!.text).not.toMatch(/\\text\{[A-Z]*\.\.\.$/);
    expect(options[1]!.full).toContain(long);
    expect(options[2]!.text).toBe("Section · Motivation");
    expect([...kindsWithTargets(options)].sort()).toEqual(["figure", "formula", "heading"]);
  });
});

describe("buildRefOptions with blocks of other documents", () => {
  it("names the document and keeps where the block is in the value", () => {
    const options = buildRefOptions(
      [],
      [],
      name,
      [{ documentId: "d2", block: 3, kind: "cha", text: "Method", document: { kind: "chapter", position: 1, title: "Chapter 2" } }],
    );
    expect(options).toEqual([
      { value: "r:d2:3:cha", kind: "heading", text: "Chapter · Method (Chapter 2)", full: "Chapter · Method (Chapter 2)", labeled: false },
    ]);
  });

  it("names the document by its kind and number when it has no title of its own", () => {
    const options = buildRefOptions(
      [],
      [],
      name,
      [
        { documentId: "d2", block: 3, kind: "cha", text: "Method", document: { kind: "chapter", position: 2, title: "" } },
        { documentId: "d3", block: 1, kind: "sec", text: "Data", document: { kind: "chapter", position: 3, title: "Data chapter" } },
      ],
      (document) => document.title || `${document.kind} ${document.position}`,
    );
    expect(options.map((o) => o.text)).toEqual(["Chapter · Method (chapter 2)", "Section · Data (Data chapter)"]);
    expect(options.every((o) => !o.text.includes("()"))).toBe(true);
  });
});
