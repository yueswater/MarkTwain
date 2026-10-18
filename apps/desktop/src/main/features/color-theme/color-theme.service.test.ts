import { beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "../../core/errors";
import { ColorThemeService } from "./color-theme.service";

const FILE = (name: string, mode = "dark") => `name: ${name}\nmode: ${mode}\ncolors:\n  background: "#101010"\n  foreground: "#eeeeee"\n  primary: "#3478f6"\n`;

let builtin: string;
let user: string;
let service: ColorThemeService;

beforeEach(() => {
  const work = mkdtempSync(join(tmpdir(), "mt-themes "));
  builtin = join(work, "builtin");
  user = join(work, "用戶", "themes");
  mkdirSync(builtin, { recursive: true });
  writeFileSync(join(builtin, "nord.marktwain.colortheme"), FILE("Nord"));
  writeFileSync(join(builtin, "a-light.marktwain.colortheme"), FILE("A Light", "light"));
  writeFileSync(join(builtin, "broken.marktwain.colortheme"), "not: [a theme");
  writeFileSync(join(builtin, "notes.txt"), "x");
  service = new ColorThemeService(() => builtin, () => user);
});

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? `${e.code}:${e.params.field ?? ""}` : "other";
  }
  return "none";
};

function theme(name: string, text: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "mt-in ")), name);
  writeFileSync(path, text);
  return path;
}

describe("ColorThemeService", () => {
  it("lists the themes of the app in the order of the community, those that are not known by name, leaves out files that do not read, and has no folder of the person yet", () => {
    expect(service.list().map((t) => [t.id, t.name, t.builtin])).toEqual([
      ["nord", "Nord", true],
      ["a-light", "A Light", true],
    ]);
  });

  it("keeps a copy of an imported theme and lists it after those of the app", () => {
    const imported = service.importFile(theme("My Theme.marktwain.colortheme", FILE("Mine")));
    expect(imported).toMatchObject({ id: "my-theme", name: "Mine", builtin: false });
    expect(existsSync(join(user, "my-theme.marktwain.colortheme"))).toBe(true);
    expect(service.list().map((t) => t.id)).toEqual(["nord", "a-light", "my-theme"]);
  });

  it("gives a theme another name when its file name is taken, by the app or by an earlier import", () => {
    expect(service.importFile(theme("nord.marktwain.colortheme", FILE("Same"))).id).toBe("nord-2");
    expect(service.importFile(theme("nord.marktwain.colortheme", FILE("Again"))).id).toBe("nord-3");
    expect(service.importFile(theme("日本語.marktwain.colortheme", FILE("Kanji"))).id).toBe("theme");
  });

  it("refuses a file that is not a theme and names the part that is wrong, and keeps nothing", () => {
    expect(code(() => service.importFile(theme("a.marktwain.colortheme", "just text")))).toBe("theme.not-yaml:");
    expect(code(() => service.importFile(theme("a.marktwain.colortheme", "name: A\nmode: dark\ncolors:\n  background: '#000'\n  foreground: '#fff'")))).toBe("theme.missing:colors.primary");
    expect(code(() => service.importFile(theme("a.marktwain.colortheme", FILE("A", "blue"))))).toBe("theme.bad-value:mode");
    expect(existsSync(user)).toBe(false);
  });

  it("refuses a file that is far too large", () => {
    expect(code(() => service.importFile(theme("big.marktwain.colortheme", `${FILE("Big")}# ${"x".repeat(70_000)}\n`)))).toBe("theme.too-large:");
  });

  it("asks the dialog for the file, and does nothing when the person cancels", async () => {
    expect(await service.import({ chooseColorTheme: async () => null })).toBeNull();
    const path = theme("Chosen.marktwain.colortheme", FILE("Chosen"));
    expect((await service.import({ chooseColorTheme: async () => path }))?.id).toBe("chosen");
  });

  it("removes a theme that was added and never one of the app", () => {
    service.importFile(theme("mine.marktwain.colortheme", FILE("Mine")));
    service.remove("mine");
    expect(readdirSync(user)).toEqual([]);
    expect(code(() => service.remove("mine"))).toBe("theme.not-found:");
    expect(code(() => service.remove("nord"))).toBe("theme.not-found:");
    expect(code(() => service.remove("../nord"))).toBe("theme.not-found:");
    expect(service.list().map((t) => t.id)).toEqual(["nord", "a-light"]);
  });
});
