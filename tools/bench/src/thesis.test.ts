import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "@marktwain/schema";
import { SHAPES, makeThesis } from "./thesis";

describe("makeThesis", () => {
  it("makes the requested number of chapters plus front matter", () => {
    const docs = makeThesis(SHAPES.medium);
    expect(docs.filter((d) => d.kind === "chapter")).toHaveLength(SHAPES.medium.chapters);
    expect(docs.map((d) => d.kind).slice(0, 2)).toEqual(["acknowledgement", "abstract"]);
  });

  it("grows with the shape and every chapter parses", () => {
    const small = makeThesis(SHAPES.small).reduce((n, d) => n + d.text.length, 0);
    const long = makeThesis(SHAPES.long).reduce((n, d) => n + d.text.length, 0);
    expect(long).toBeGreaterThan(small * 20);
    for (const doc of makeThesis(SHAPES.long)) expect(parseMarkdown(doc.text).content.length).toBeGreaterThan(0);
  });

  it("uses unique labels so the thesis builds", () => {
    const text = makeThesis(SHAPES.long).map((d) => d.text).join("\n");
    const labels = [...text.matchAll(/\{#((?:fig|tbl|eq|cha):[\w]+)/g)].map((m) => m[1]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
