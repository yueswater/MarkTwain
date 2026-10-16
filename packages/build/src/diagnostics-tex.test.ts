import { describe, expect, it } from "@jest/globals";
import type { LineMap } from "./diagnostics";
import { parseTexLog } from "./diagnostics-tex";

const lineMap: LineMap = new Map([["contents/chapter01.tex", { documentId: "c1", blockLines: [1, 3, 8] }]]);

describe("parseTexLog", () => {
  it("reads an error with its file and line back to the block that holds the line", () => {
    const log = ["(./main.tex", "./contents/chapter01.tex:9: Undefined control sequence.", "<recently read> \\badcommand", "", "l.9 \\badcommand", ""].join("\n");
    const [first] = parseTexLog(log, lineMap);
    expect(first).toMatchObject({ severity: "error", file: "contents/chapter01.tex", line: 9, source: { documentId: "c1", block: 2 } });
    expect(first?.message).toContain("Undefined control sequence");
  });

  it("collects the characters that the font does not have into one warning, each character once", () => {
    const log = [
      "Missing character: There is no 😀 (U+1F600) in font [TW-MOE-Std-Kai]:script=hani;language=dflt;!",
      "Missing character: There is no 한 (U+D55C) in font [TW-MOE-Std-Kai]:script=hani;language=dflt;!",
      "Missing character: There is no 😀 (U+1F600) in font [TW-MOE-Std-Kai]:script=hani;language=dflt;!",
    ].join("\n");
    expect(parseTexLog(log, lineMap)).toEqual([{ severity: "warning", code: "glyph-missing", message: "😀 한", file: null, line: null, column: null, source: null }]);
  });

  it("does not call an error an error when TeX says that it ignored it, and drops the glue message of a long table", () => {
    const log = [
      "./contents/chapter01.tex:88: ignored error: Infinite glue shrinkage found in box being split [1",
      "./contents/chapter01.tex:3: ignored error: Something else that TeX went past",
    ].join("\n");
    expect(parseTexLog(log, lineMap).map((d) => [d.severity, d.message.slice(0, 40)])).toEqual([["warning", "ignored error: Something else that TeX w"]]);
  });

  it("lists an undefined citation once", () => {
    const log = ["LaTeX Warning: Citation `a' on page 3 undefined on input line 12.", "LaTeX Warning: Citation `a' on page 4 undefined on input line 30."].join("\n");
    expect(parseTexLog(log, lineMap).map((d) => d.message)).toEqual(["undefined citation a on page 3"]);
  });

  it("falls back to the line that starts with an exclamation mark when no error names a file", () => {
    expect(parseTexLog("! Emergency stop.\n", lineMap).map((d) => [d.severity, d.message])).toEqual([["error", "Emergency stop."]]);
  });
});
