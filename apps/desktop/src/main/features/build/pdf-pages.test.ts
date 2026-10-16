import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pageCountOf } from "./pdf-pages";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "fixtures", name)));

describe("pageCountOf", () => {
  it("counts a page tree of plain objects, the root has the largest count", () => {
    expect(pageCountOf(new TextEncoder().encode("/Count 2 /Kids [] /Count 7 /Count 3"))).toBe(7);
    expect(pageCountOf(new Uint8Array())).toBe(0);
  });

  it("counts the pages of a real Typst PDF", () => {
    expect(pageCountOf(fixture("typst-2-pages.pdf"))).toBe(2);
  });

  it("counts the pages of a real XeLaTeX PDF, whose page tree is in a compressed object stream", () => {
    const pdf = fixture("xelatex-3-pages.pdf");
    expect(Buffer.from(pdf).toString("latin1")).not.toMatch(/\/Count\s+\d/);
    expect(pageCountOf(pdf)).toBe(3);
  });

  it("does not fail on a damaged stream", () => {
    const broken = Buffer.from("<< /Type /ObjStm /N 1 /First 4 /Length 5 /Filter /FlateDecode >>\nstream\nxxxxx\nendstream /Count 4");
    expect(pageCountOf(new Uint8Array(broken))).toBe(4);
  });
});
