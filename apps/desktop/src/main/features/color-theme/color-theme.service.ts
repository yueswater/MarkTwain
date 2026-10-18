import { COLOR_THEME_EXTENSION, ColorThemeError, parseColorTheme } from "@marktwain/schema";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { ColorThemeView } from "../../../shared/ipc";
import { AppError } from "../../core/errors";
import type { DialogService } from "../dialog/dialog.service";

/** A theme file is a few lines, anything much larger is not one. */
const MAX_BYTES = 64 * 1024;

/** The order of the themes that come with the app, by how often they are downloaded from the community, a theme that is not here comes after them by name. */
const BUILTIN_ORDER = [
  "minimal", "things", "blue-topaz", "nord", "atom", "obsidianite", "typewriter", "gruvbox", "primary", "catppuccin", "tokyo-night",
  "dracula", "everforest", "github", "solarized", "cybertron", "cupertino", "notation", "terminal", "typomagical", "marktwain-dark",
];

const rank = (id: string): number => {
  const at = BUILTIN_ORDER.indexOf(id);
  return at === -1 ? BUILTIN_ORDER.length : at;
};

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

function toError(error: unknown): never {
  if (error instanceof ColorThemeError) {
    const code = error.reason === "not-yaml" ? ErrorCode.ThemeNotYaml : error.reason === "missing" ? ErrorCode.ThemeMissing : ErrorCode.ThemeBadValue;
    throw new AppError(code, { field: error.field });
  }
  throw error;
}

/** The color themes: the files that come with the app, and the files that the person added, each a copy in a folder of the app. */
export class ColorThemeService {
  constructor(
    private readonly builtinFolder: () => string,
    private readonly userFolder: () => string,
  ) {}

  private read(folder: string, builtin: boolean): ColorThemeView[] {
    if (!existsSync(folder)) return [];
    return readdirSync(folder)
      .filter((name) => name.endsWith(COLOR_THEME_EXTENSION))
      .sort()
      .flatMap((name) => {
        try {
          const id = name.slice(0, -COLOR_THEME_EXTENSION.length);
          return [{ ...parseColorTheme(readFileSync(join(folder, name), "utf8"), id), builtin }];
        } catch {
          // A file that was changed by hand and no longer reads is left out, it does not stop the others
          return [];
        }
      });
  }

  list(): ColorThemeView[] {
    const builtin = this.read(this.builtinFolder(), true).sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
    return [...builtin, ...this.read(this.userFolder(), false)];
  }

  /** Asks for a file, keeps a checked copy under a name that no other theme has, and returns the theme. */
  async import(dialogs: Pick<DialogService, "chooseColorTheme">): Promise<ColorThemeView | null> {
    const path = await dialogs.chooseColorTheme();
    if (!path) return null;
    return this.importFile(path);
  }

  importFile(path: string): ColorThemeView {
    if (statSync(path).size > MAX_BYTES) throw new AppError(ErrorCode.ThemeTooLarge);
    const text = readFileSync(path, "utf8");
    const taken = new Set(this.list().map((theme) => theme.id));
    const stem = slug(basename(path).replace(/\.marktwain\.colortheme$/i, "").replace(/\.colortheme$/i, "")) || "theme";
    let id = stem;
    for (let n = 2; taken.has(id); n++) id = `${stem}-${n}`;
    let theme;
    try {
      theme = parseColorTheme(text, id);
    } catch (error) {
      toError(error);
    }
    mkdirSync(this.userFolder(), { recursive: true });
    writeFileSync(join(this.userFolder(), `${id}${COLOR_THEME_EXTENSION}`), text);
    return { ...theme, builtin: false };
  }

  remove(id: string): void {
    if (!/^[a-z0-9-]+$/.test(id)) throw new AppError(ErrorCode.ThemeNotFound);
    const file = join(this.userFolder(), `${id}${COLOR_THEME_EXTENSION}`);
    if (!existsSync(file)) throw new AppError(ErrorCode.ThemeNotFound);
    rmSync(file);
  }
}
