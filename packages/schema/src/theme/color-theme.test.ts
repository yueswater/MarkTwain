import { describe, expect, it } from "@jest/globals";
import { ColorThemeError, parseColorTheme, readableOn, themeVariables, writeColorTheme } from "./color-theme";

const MINIMAL = `
name: Nord
mode: dark
colors:
  background: "#2E3440"
  foreground: "#d8dee9"
  primary: "#88c"
`;

function reason(source: string): string {
  try {
    parseColorTheme(source, "x");
    return "ok";
  } catch (error) {
    return error instanceof ColorThemeError ? `${error.reason}:${error.field}` : "other";
  }
}

describe("parseColorTheme", () => {
  it("reads the three colors that are needed and writes them as #rrggbb in lower case", () => {
    expect(parseColorTheme(MINIMAL, "nord")).toEqual({
      id: "nord",
      name: "Nord",
      author: "",
      source: "",
      mode: "dark",
      colors: { background: "#2e3440", foreground: "#d8dee9", primary: "#8888cc" },
    });
  });

  it("keeps the colors that are given besides, and leaves out keys that it does not know", () => {
    const theme = parseColorTheme(`${MINIMAL}  border: "#444"\n  heading: "#fff"\n  glitter: "#123"\nauthor: Someone\nsource: https://example.com\nextra: 1\n`, "nord");
    expect(theme.colors).toEqual({ background: "#2e3440", foreground: "#d8dee9", primary: "#8888cc", border: "#444444", heading: "#ffffff" });
    expect(theme.author).toBe("Someone");
    expect(theme.source).toBe("https://example.com");
  });

  it("names the field that is wrong", () => {
    expect(reason("::: not yaml :::\n  - [")).toBe("not-yaml:");
    expect(reason("just text")).toBe("not-yaml:");
    expect(reason("- a\n- b")).toBe("not-yaml:");
    expect(reason("mode: dark\ncolors: {}")).toBe("missing:name");
    expect(reason("name: A\ncolors: {}")).toBe("missing:mode");
    expect(reason("name: A\nmode: blue\ncolors: {}")).toBe("bad-value:mode");
    expect(reason("name: A\nmode: dark")).toBe("missing:colors");
    expect(reason("name: A\nmode: dark\ncolors: [1]")).toBe("bad-value:colors");
    expect(reason("name: A\nmode: dark\ncolors:\n  background: '#fff'\n  foreground: '#000'")).toBe("missing:colors.primary");
    expect(reason("name: A\nmode: dark\ncolors:\n  background: red\n  foreground: '#000'\n  primary: '#111'")).toBe("bad-value:colors.background");
    expect(reason(`${MINIMAL}  border: "nope"`)).toBe("bad-value:colors.border");
    expect(reason(`name: ${"x".repeat(41)}\nmode: dark\ncolors: {}`)).toBe("bad-value:name");
  });

  it("writes a file that reads back the same", () => {
    const theme = parseColorTheme(`${MINIMAL}  link: "#0af"\nauthor: Me\n`, "t");
    const { id, ...rest } = theme;
    expect(parseColorTheme(writeColorTheme(rest), id)).toEqual(theme);
  });
});

describe("readableOn", () => {
  it("takes black on a light color and white on a dark one", () => {
    expect(readableOn("#ffffff")).toBe("#111111");
    expect(readableOn("#fabd2f")).toBe("#111111");
    expect(readableOn("#000000")).toBe("#ffffff");
    expect(readableOn("#3478f6")).toBe("#ffffff");
  });
});

describe("themeVariables", () => {
  it("is complete with three colors, and mixes what the file does not give", () => {
    const vars = themeVariables(parseColorTheme(MINIMAL, "nord"));
    expect(vars["--background"]).toBe("#2e3440");
    expect(vars["--primary"]).toBe("#8888cc");
    expect(vars["--primary-foreground"]).toBe("#111111");
    expect(vars["--muted"]).toBe("color-mix(in oklab, #2e3440, #d8dee9 7%)");
    expect(vars["--destructive"]).toBe("#f2677a");
    expect(vars["--editor-heading"]).toBe("#d8dee9");
    expect(vars["--editor-link"]).toBe("#8888cc");
    // The text of a link on hover is the color that reads on the fill
    expect(vars["--editor-link-contrast"]).toBe("#111111");
  });

  it("takes the colors that the file gives", () => {
    const vars = themeVariables(parseColorTheme(`${MINIMAL}  surface: "#222"\n  border: "#555"\n  heading: "#f0f"\n  link: "#0ff"\n  destructive: "#f00"\n`, "x"));
    expect(vars["--card"]).toBe("#222222");
    expect(vars["--sidebar"]).toBe("#222222");
    expect(vars["--border"]).toBe("#555555");
    expect(vars["--editor-heading"]).toBe("#ff00ff");
    expect(vars["--editor-link"]).toBe("#00ffff");
    expect(vars["--editor-link-contrast"]).toBe("#111111");
    expect(vars["--destructive"]).toBe("#ff0000");
  });
});
