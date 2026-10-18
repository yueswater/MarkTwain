import { describe, expect, it } from "@jest/globals";
import { DEFAULT_PREFS, sanitizePrefs } from "./prefs";

describe("sanitizePrefs", () => {
  it("returns the defaults for nothing or for garbage", () => {
    expect(sanitizePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs("x")).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ fontSize: "huge", lineNumbers: "yes", contentWidth: "huge" })).toEqual(DEFAULT_PREFS);
  });

  it("keeps good values and clamps numbers into their range", () => {
    const prefs = sanitizePrefs({ fontSize: 18.4, lineHeight: 9, codeFontSize: 2, lineNumbers: true, contentWidth: "wide", fontFamily: "serif" });
    expect(prefs).toMatchObject({ fontSize: 18, lineHeight: 2.4, codeFontSize: 10, lineNumbers: true, contentWidth: "wide", fontFamily: "serif" });
  });

  it("applies a patch on top of the current values", () => {
    const current = sanitizePrefs({ fontSize: 20, lineNumbers: true });
    expect(sanitizePrefs({ spellcheck: true }, current)).toMatchObject({ fontSize: 20, lineNumbers: true, spellcheck: true });
  });
});

describe("heading names", () => {
  it("keeps three short names and empties what is not a name", () => {
    expect(sanitizePrefs({ headingNames: [" 節 ", "x".repeat(40), 5] }).headingNames).toEqual(["節", "x".repeat(16), ""]);
    expect(sanitizePrefs({ headingNames: "節" }).headingNames).toEqual(["", "", ""]);
  });
});

describe("statement prefs", () => {
  it("keeps the style and only valid colors of known kinds", () => {
    const prefs = sanitizePrefs({ statementStyle: "colored", statementColors: { lemma: "#abcdef", theorem: "red", nope: "#000000" } });
    expect(prefs.statementStyle).toBe("colored");
    expect(prefs.statementColors).toEqual({ lemma: "#ABCDEF" });
    expect(sanitizePrefs({ statementStyle: "boxed" }).statementStyle).toBe("callout");
  });

  it("keeps the id of a color theme when it is one, and falls back to the default otherwise", () => {
    expect(sanitizePrefs({ colorTheme: "tokyo-night" }).colorTheme).toBe("tokyo-night");
    for (const bad of ["../x", "Nord", "", 3, null, "a".repeat(61)]) expect(sanitizePrefs({ colorTheme: bad }).colorTheme).toBe("default");
    expect(sanitizePrefs({ colorTheme: "nord" }, { ...DEFAULT_PREFS, colorTheme: "dracula" }).colorTheme).toBe("nord");
    expect(sanitizePrefs({}, { ...DEFAULT_PREFS, colorTheme: "dracula" }).colorTheme).toBe("dracula");
  });
});
