import { describe, expect, it } from "@jest/globals";
import { assignPaths, renderMain } from "./layout";
import { locate, parseDiagnostics, type LineMap } from "./diagnostics";
import type { BuildDocument } from "./types";

const doc = (id: string, kind: BuildDocument["kind"]): BuildDocument => ({ id, kind, text: "" });

describe("assignPaths and renderMain", () => {
  const docs = [doc("a", "abstract"), doc("c1", "chapter"), doc("c2", "chapter"), doc("x", "appendix"), doc("k", "acknowledgement")];

  it("numbers chapters and appendices and maps the front matter", () => {
    const paths = assignPaths(docs);
    expect([...paths.values()]).toEqual([
      "contents/front/abstract.typ",
      "contents/chapter01.typ",
      "contents/chapter02.typ",
      "contents/back/appendix01.typ",
      "contents/front/acknowledgement.typ",
    ]);
  });

  it("includes only documents that exist, in template order", () => {
    const main = renderMain(docs, assignPaths(docs), true);
    const includes = main.split("\n").filter((l) => l.startsWith("#include") || l.startsWith("#references"));
    expect(includes).toEqual([
      '#include "contents/front/acknowledgement.typ"',
      '#include "contents/front/abstract.typ"',
      '#include "contents/chapter01.typ"',
      '#include "contents/chapter02.typ"',
      "#references()",
      '#include "contents/back/appendix01.typ"',
    ]);
  });

  it("omits references without bibliography files", () => {
    expect(renderMain(docs, assignPaths(docs), false)).not.toContain("#references()");
  });
});

describe("parseDiagnostics", () => {
  const map: LineMap = new Map([["contents/chapter01.typ", { documentId: "c1", blockLines: [3, 6, null, 12] }]]);

  it("parses human readable diagnostics and prefers the content file in the call trace", () => {
    const stderr = [
      "error: file not found (searched at /tmp/x.png)",
      "   ┌─ helper/figure.typ:11:8",
      "   │",
      "11 │     image(src, width: width)",
      "   │     ^^^^^",
      "",
      "  while calling `fig` at helper/mod.typ:33:37",
      "  while calling `fig` at contents/chapter01.typ:7:2",
      "",
      "warning: unknown font family: dfkai-sb",
      "   ┌─ lib/template.typ:21:10",
      "",
      "error: cannot read file",
    ].join("\n");
    expect(parseDiagnostics(stderr, map)).toEqual([
      { severity: "error", message: "file not found (searched at /tmp/x.png)", file: "contents/chapter01.typ", line: 7, column: 2, source: { documentId: "c1", block: 1 } },
      { severity: "warning", message: "unknown font family: dfkai-sb", file: "lib/template.typ", line: 21, column: 10, source: null },
      { severity: "error", message: "cannot read file", file: null, line: null, column: null, source: null },
    ]);
  });

  it("returns null for lines before the first block or in unknown files", () => {
    expect(locate(map, "contents/chapter01.typ", 1)).toBeNull();
    expect(locate(map, "main.typ", 5)).toBeNull();
  });
});
