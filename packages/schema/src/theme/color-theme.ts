import { parse } from "yaml";

/** The extension of a color theme file, the content is YAML. */
export const COLOR_THEME_EXTENSION = ".marktwain.colortheme";

/** The colors that a theme file has to give, every other color is worked out from these. */
export const REQUIRED_COLORS = ["background", "foreground", "primary"] as const;

/** The colors that a theme file may give besides the required ones. */
export const OPTIONAL_COLORS = ["surface", "muted", "muted-foreground", "border", "destructive", "heading", "link"] as const;

export type ThemeColors = { [K in (typeof REQUIRED_COLORS)[number]]: string } & { [K in (typeof OPTIONAL_COLORS)[number]]?: string };

export type ColorTheme = {
  id: string;
  name: string;
  author: string;
  /** Where the look comes from, a web address or empty */
  source: string;
  mode: "light" | "dark";
  colors: ThemeColors;
};

/** Why a theme file cannot be used, the field says which part of the file it is. */
export class ColorThemeError extends Error {
  constructor(
    readonly reason: "not-yaml" | "missing" | "bad-value",
    readonly field: string,
  ) {
    super(`${reason}: ${field}`);
    this.name = "ColorThemeError";
  }
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isThemeColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

/** #RGB becomes #RRGGBB and the letters are lower case, so two spellings of a color are one. */
function normalizeColor(value: string): string {
  const hex = value.trim().toLowerCase();
  return hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
}

function text(value: unknown, field: string, max: number, required: boolean): string {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ColorThemeError("missing", field);
    return "";
  }
  if (typeof value !== "string" && typeof value !== "number") throw new ColorThemeError("bad-value", field);
  const out = String(value).trim();
  if (out === "" && required) throw new ColorThemeError("missing", field);
  if (out.length > max) throw new ColorThemeError("bad-value", field);
  return out;
}

/** Reads a theme file. Whatever is not in the format is told with the field that is wrong, and keys that are not known are left out. */
export function parseColorTheme(source: string, id: string): ColorTheme {
  let data: unknown;
  try {
    data = parse(source);
  } catch {
    throw new ColorThemeError("not-yaml", "");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new ColorThemeError("not-yaml", "");
  const root = data as Record<string, unknown>;
  const name = text(root.name, "name", 40, true);
  const mode = root.mode;
  if (mode === undefined) throw new ColorThemeError("missing", "mode");
  if (mode !== "light" && mode !== "dark") throw new ColorThemeError("bad-value", "mode");
  const given = root.colors;
  if (given === undefined || given === null) throw new ColorThemeError("missing", "colors");
  if (typeof given !== "object" || Array.isArray(given)) throw new ColorThemeError("bad-value", "colors");
  const colors: Record<string, string> = {};
  for (const key of REQUIRED_COLORS) {
    const value = (given as Record<string, unknown>)[key];
    if (value === undefined) throw new ColorThemeError("missing", `colors.${key}`);
    if (!isThemeColor(value)) throw new ColorThemeError("bad-value", `colors.${key}`);
    colors[key] = normalizeColor(value);
  }
  for (const key of OPTIONAL_COLORS) {
    const value = (given as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    if (!isThemeColor(value)) throw new ColorThemeError("bad-value", `colors.${key}`);
    colors[key] = normalizeColor(value);
  }
  return {
    id,
    name,
    author: text(root.author, "author", 60, false),
    source: text(root.source, "source", 200, false),
    mode,
    colors: colors as ThemeColors,
  };
}

/** The text of a theme file, the same as the files that come with the app. */
export function writeColorTheme(theme: Omit<ColorTheme, "id">): string {
  const lines = [`name: ${JSON.stringify(theme.name)}`];
  if (theme.author) lines.push(`author: ${JSON.stringify(theme.author)}`);
  if (theme.source) lines.push(`source: ${JSON.stringify(theme.source)}`);
  lines.push(`mode: ${theme.mode}`, "colors:");
  for (const key of [...REQUIRED_COLORS, ...OPTIONAL_COLORS]) {
    const value = theme.colors[key];
    if (value) lines.push(`  ${key}: "${value}"`);
  }
  return `${lines.join("\n")}\n`;
}

/** White when it reads on the color with a contrast of 4 or more, else the one of white and near black that reads better. */
export function readableOn(color: string): "#ffffff" | "#111111" {
  const hex = normalizeColor(color).slice(1);
  const [r, g, b] = [0, 2, 4].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const lightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const onWhite = 1.05 / (lightness + 0.05);
  const onBlack = (lightness + 0.05) / (0.0056 + 0.05);
  return onWhite >= 4 || onWhite >= onBlack ? "#ffffff" : "#111111";
}

const mix = (a: string, b: string, share: number): string => `color-mix(in oklab, ${a}, ${b} ${share}%)`;

/**
 * The CSS variables of a theme, the names are those that the components of the app read. Colors that the file does not give
 * are mixed from the ones that it gives, so a theme of three colors is complete.
 */
export function themeVariables(theme: ColorTheme): Record<string, string> {
  const { background, foreground, primary } = theme.colors;
  const surface = theme.colors.surface ?? mix(background, foreground, 3);
  const muted = theme.colors.muted ?? mix(background, foreground, 7);
  const mutedForeground = theme.colors["muted-foreground"] ?? mix(foreground, background, 40);
  const border = theme.colors.border ?? mix(background, foreground, 14);
  const destructive = theme.colors.destructive ?? (theme.mode === "dark" ? "#f2677a" : "#db2d43");
  const onPrimary = readableOn(primary);
  return {
    "--background": background,
    "--foreground": foreground,
    "--card": surface,
    "--card-foreground": foreground,
    "--popover": surface,
    "--popover-foreground": foreground,
    "--primary": primary,
    "--primary-foreground": onPrimary,
    "--secondary": muted,
    "--secondary-foreground": foreground,
    "--muted": muted,
    "--muted-foreground": mutedForeground,
    "--accent": muted,
    "--accent-foreground": foreground,
    "--destructive": destructive,
    "--destructive-foreground": readableOn(destructive),
    "--border": border,
    "--input": border,
    "--ring": mix(primary, background, 40),
    "--sidebar": surface,
    "--sidebar-foreground": foreground,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": onPrimary,
    "--sidebar-accent": muted,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-border": border,
    "--sidebar-ring": mix(primary, background, 40),
    "--editor-heading": theme.colors.heading ?? foreground,
    "--editor-link": theme.colors.link ?? primary,
    "--editor-link-contrast": readableOn(theme.colors.link ?? primary),
    "--editor-selection": `color-mix(in oklab, ${primary} 28%, transparent)`,
  };
}
