import { describe, expect, it } from "@jest/globals";
import type { BuildDiagnostic } from "../../../../shared/ipc";
import { showNotes, warningItems } from "./build-notes";

const diag = (over: Partial<BuildDiagnostic>): BuildDiagnostic => ({
  severity: "warning",
  code: null,
  message: "",
  file: null,
  line: null,
  source: null,
  ...over,
});

describe("warningItems", () => {
  it("is empty when there is nothing to say", () => {
    expect(warningItems([], [])).toEqual([]);
    expect(warningItems([diag({ severity: "error", message: "boom" })], [])).toEqual([]);
  });

  it("joins unfilled settings and citations into one line each", () => {
    const items = warningItems(
      [
        diag({ code: "config-missing", message: "author" }),
        diag({ code: "config-missing", message: "id" }),
        diag({ code: "citation-no-bibliography", message: "a" }),
        diag({ code: "citation-no-bibliography", message: "b" }),
      ],
      [],
    );
    expect(items).toEqual([
      { kind: "configMissing", fields: ["author", "id"] },
      { kind: "citation", keys: ["a", "b"] },
    ]);
  });

  it("lists a feature that LaTeX output only approximates by its name", () => {
    expect(warningItems([diag({ code: "latex-approximate", message: "table-lines" })], [])).toEqual([{ kind: "approximate", feature: "table-lines" }]);
  });

  it("lists a Typst warning that no kind knows, and the font warning by font", () => {
    const items = warningItems(
      [
        diag({ message: "unknown font family: dfkai-sb", file: "lib/template.typ", line: 21 }),
        diag({ message: "unknown font family: dfkai-sb" }),
        diag({ message: "something odd", file: "contents/a.typ", line: 3 }),
      ],
      ["\\frac{a"],
    );
    expect(items).toEqual([
      { kind: "math", latex: "\\frac{a" },
      { kind: "font", font: "dfkai-sb" },
      { kind: "other", message: "something odd", file: "contents/a.typ", line: 3, source: null },
    ]);
  });
});

describe("showNotes", () => {
  it("never shows an empty area", () => {
    expect(showNotes([], [])).toBe(false);
    expect(showNotes([diag({ severity: "error" })], [])).toBe(true);
    expect(showNotes([], [{ kind: "font", font: "x" }])).toBe(true);
  });
});
