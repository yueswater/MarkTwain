import { describe, expect, it } from "@jest/globals";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { COLOR_THEME_EXTENSION, parseColorTheme } from "./color-theme";

const folder = resolve(__dirname, "../../../../resources/color-themes");
const files = readdirSync(folder).filter((name) => name.endsWith(COLOR_THEME_EXTENSION));

/** The contrast ratio of two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const lightness = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((at) => {
      const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lightness(a), lightness(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

describe("the color themes that come with the app", () => {
  it("are twenty from the community and one of MarkTwain, every file in the format", () => {
    expect(files).toHaveLength(21);
    for (const name of files) expect(() => parseColorTheme(readFileSync(join(folder, name), "utf8"), name)).not.toThrow();
  });

  it("have a name that is theirs, and a mode that matches the background", () => {
    const names = new Set<string>();
    for (const name of files) {
      const theme = parseColorTheme(readFileSync(join(folder, name), "utf8"), name.slice(0, -COLOR_THEME_EXTENSION.length));
      expect(names.has(theme.name)).toBe(false);
      names.add(theme.name);
      // A dark theme has a background darker than its text, a light theme the other way round
      const dark = contrast(theme.colors.background, "#000000") < contrast(theme.colors.background, "#ffffff");
      expect({ id: theme.id, dark }).toEqual({ id: theme.id, dark: theme.mode === "dark" });
    }
  });

  it("can be read: the text has a contrast of 4.5 on the background, the muted text 3, the border is seen", () => {
    for (const name of files) {
      const { colors, id } = parseColorTheme(readFileSync(join(folder, name), "utf8"), name);
      expect({ id, text: contrast(colors.foreground, colors.background) >= 4.5 }).toEqual({ id, text: true });
      if (colors["muted-foreground"]) expect({ id, muted: contrast(colors["muted-foreground"], colors.background) >= 3 }).toEqual({ id, muted: true });
      expect({ id, primary: contrast(colors.primary, colors.background) >= 2 }).toEqual({ id, primary: true });
    }
  });
});
