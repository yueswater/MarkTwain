import { describe, expect, it } from "@jest/globals";
import type { BuildDiagnostic } from "../../../../shared/ipc";
import { configFieldName, showNotes, warningItems } from "./build-notes";

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

  it("lists a reference to something that is not in the thesis with its block", () => {
    const source = { documentId: "c1", block: 4 };
    expect(warningItems([diag({ code: "reference-broken", message: "fig:nope", source })], [])).toEqual([{ kind: "brokenRef", label: "fig:nope", source }]);
  });

  it("lists a name that more than one block uses with the block that lost it", () => {
    const source = { documentId: "c1", block: 3 };
    expect(warningItems([diag({ code: "label-duplicate", message: "fig:dup", source })], [])).toEqual([{ kind: "duplicateLabel", label: "fig:dup", source }]);
  });

  it("lists the characters that the font does not have", () => {
    expect(warningItems([diag({ code: "glyph-missing", message: "😀 한" })], [])).toEqual([{ kind: "glyphMissing", chars: "😀 한" }]);
  });

  it("lists every picture that is missing or is not a picture with its block, and the unknown citations by key", () => {
    const source = { documentId: "c1", block: 3 };
    expect(
      warningItems(
        [
          diag({ code: "image-missing", message: "images/a.png", source }),
          diag({ code: "image-unreadable", message: "images/b.png", source: { documentId: "c2", block: 0 } }),
          diag({ code: "citation-unknown", message: "ghost" }),
        ],
        [],
      ),
    ).toEqual([
      { kind: "image", reason: "missing", source },
      { kind: "image", reason: "unreadable", source: { documentId: "c2", block: 0 } },
      { kind: "unknownCitation", keys: ["ghost"] },
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

describe("configFieldName", () => {
  it("turns a key of config.yml into the name of the field of the settings", () => {
    expect(configFieldName("title-en")).toBe("titleEn");
    expect(configFieldName("oral-date")).toBe("oralDate");
    expect(configFieldName("id")).toBe("id");
    expect(configFieldName("keywords-en")).toBe("keywordsEn");
  });
});
