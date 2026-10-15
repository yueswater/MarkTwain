import { FontFormatError, readFonts, type FontFace } from "@marktwain/schema";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { run } from "@marktwain/build";
import type { FontAddResult, FontFamilyEntry, FontFileInput, FontRemoveResult, FontSkipReason, FontsView, MissingFont } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import type { BuildPaths } from "../toolchain/build-paths";
import type { ConfigService } from "../config/config.service";

const PREFIX = "fonts/";
const EXTENSIONS = new Set([".ttf", ".otf", ".ttc", ".otc"]);
export const FONT_MAX_BYTES = 80 * 1024 * 1024;

/** The settings of the thesis that name fonts, in the order the build tries them. */
const FONT_SETTINGS = ["layout.font-latin", "layout.font-cjk"] as const;

type Runner = (command: string, args: string[], cwd: string, timeoutMs: number) => Promise<{ code: number | null; stdout: string }>;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The fonts that a thesis can use: the ones of the template, the ones the project keeps, and the ones installed on the computer. */
export class FontService {
  private readonly parsed = new Map<string, FontFace[] | null>();
  private templateCache: { dir: string; faces: { path: string; face: FontFace }[] } | null = null;
  private systemCache: Promise<string[]> | null = null;

  constructor(
    private readonly session: DatabaseSession,
    private readonly config: ConfigService,
    private readonly paths: () => BuildPaths,
    private readonly now: () => Date = () => new Date(),
    private readonly runTypst: Runner = run,
  ) {}

  /** Font files of the project for the build, with the path inside the fonts folder. */
  files(): { path: string; data: Uint8Array }[] {
    return this.rows().map((row) => ({ path: row.path.slice(PREFIX.length), data: row.data }));
  }

  private rows(): { path: string; data: Uint8Array }[] {
    return this.session.db.all<{ path: string; data: Uint8Array }>("SELECT path, data FROM files WHERE path LIKE 'fonts/%' ORDER BY path");
  }

  private facesOf(path: string, data: Uint8Array): FontFace[] {
    const key = `${path}:${data.byteLength}`;
    if (!this.parsed.has(key)) {
      try {
        this.parsed.set(key, readFonts(data));
      } catch {
        this.parsed.set(key, null);
      }
    }
    return this.parsed.get(key) ?? [];
  }

  private templateFaces(): { path: string; face: FontFace }[] {
    const dir = join(this.paths().templateDir, "fonts");
    if (this.templateCache?.dir === dir) return this.templateCache.faces;
    const faces: { path: string; face: FontFace }[] = [];
    const walk = (folder: string) => {
      let entries: string[] = [];
      try {
        entries = readdirSync(folder);
      } catch {
        return;
      }
      for (const name of entries.sort()) {
        const path = join(folder, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (EXTENSIONS.has(extname(name).toLowerCase())) {
          try {
            for (const face of readFonts(readFileSync(path))) faces.push({ path, face });
          } catch {
            // A file that cannot be read is left out of the list
          }
        }
      }
    };
    walk(dir);
    this.templateCache = { dir, faces };
    return faces;
  }

  /** Families installed on the computer, asked from typst once and kept. */
  private systemFamilies(): Promise<string[]> {
    this.systemCache ??= this.runTypst(this.paths().typst, ["fonts", "--ignore-embedded-fonts"], process.cwd(), 30_000)
      .then((result) => (result.code === 0 ? result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : []))
      .catch(() => []);
    return this.systemCache;
  }

  /** The font names of each setting in the order the build tries them. */
  private settingLists(): { path: string; names: string[] }[] {
    const { values, inherited } = this.config.advanced();
    return FONT_SETTINGS.map((path) => {
      const value = values[path] ?? inherited[path];
      const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
      return { path, names: list.filter((name): name is string => typeof name === "string" && name.trim() !== "").map((name) => name.trim()) };
    });
  }

  /** The names that the settings use for fonts, each with the settings that use it. */
  private namesInSettings(): Map<string, string[]> {
    const found = new Map<string, string[]>();
    for (const { path, names } of this.settingLists()) {
      for (const name of names) {
        const key = [...found.keys()].find((existing) => same(existing, name)) ?? name;
        found.set(key, [...(found.get(key) ?? []), path]);
      }
    }
    return found;
  }

  async list(): Promise<FontsView> {
    const used = this.namesInSettings();
    const isUsed = (name: string, aliases: string[]) => [...used.keys()].some((u) => same(u, name) || aliases.some((alias) => same(u, alias)));
    const families = new Map<string, FontFamilyEntry>();

    const add = (source: FontFamilyEntry["source"], face: FontFace, file?: { path: string; size: number }) => {
      const key = `${source}:${face.family.toLowerCase()}`;
      const entry = families.get(key) ?? { name: face.family, source, styles: [], aliases: [], files: [], used: isUsed(face.family, face.aliases) };
      if (!entry.styles.includes(face.style)) entry.styles.push(face.style);
      for (const alias of face.aliases) if (!entry.aliases.includes(alias)) entry.aliases.push(alias);
      if (file && !entry.files.some((f) => f.path === file.path)) entry.files.push(file);
      families.set(key, entry);
    };

    for (const { face, path } of this.templateFaces()) add("template", face, { path, size: statSync(path).size });
    let projectBytes = 0;
    for (const row of this.rows()) {
      projectBytes += row.data.byteLength;
      for (const face of this.facesOf(row.path, row.data)) add("project", face, { path: row.path, size: row.data.byteLength });
    }
    const system = await this.systemFamilies();
    for (const name of system) add("system", { family: name, style: "", weight: 400, italic: false, aliases: [], embeddable: true });

    const known = (name: string) => [...families.values()].some((entry) => same(entry.name, name) || entry.aliases.some((alias) => same(alias, name)));
    // A name after one that is found is a font to fall back on, and not finding it changes nothing, so only the names that matter are listed
    const missing: MissingFont[] = [];
    for (const { path, names } of this.settingLists()) {
      const firstFound = names.findIndex((name) => known(name));
      const matter = firstFound === -1 ? names : names.slice(0, firstFound);
      for (const name of matter) {
        const entry = missing.find((m) => same(m.name, name));
        if (entry) entry.usedIn.push(path);
        else missing.push({ name, usedIn: [path] });
      }
    }
    const order = { project: 0, template: 1, system: 2 } as const;
    const sorted = [...families.values()].map((entry) => (entry.source === "system" ? { ...entry, styles: [] } : entry)).sort((a, b) => order[a.source] - order[b.source] || a.name.localeCompare(b.name));
    return { families: sorted, missing, projectBytes };
  }

  /** The bytes of a font file, only of a file that belongs to the template or to the project. */
  bytes(source: "template" | "project", path: string): Uint8Array | null {
    if (source === "project") return this.rows().find((row) => row.path === path)?.data ?? null;
    const known = this.templateFaces().some((entry) => entry.path === path);
    return known ? new Uint8Array(readFileSync(path)) : null;
  }

  /** Stores font files, a file that is not a font, may not be embedded, or is there already is skipped with the reason. */
  async add(files: FontFileInput[]): Promise<FontAddResult> {
    const added: string[] = [];
    const skipped: FontAddResult["skipped"] = [];
    const known = [...this.templateFaces().map((t) => t.face), ...this.rows().flatMap((row) => this.facesOf(row.path, row.data))];
    const taken = new Set(this.rows().map((row) => row.path));
    const skip = (name: string, reason: FontSkipReason) => skipped.push({ name, reason });

    for (const file of files) {
      const name = basename(file.name);
      if (!EXTENSIONS.has(extname(name).toLowerCase())) {
        skip(name, "notFont");
        continue;
      }
      if (file.data.byteLength > FONT_MAX_BYTES) {
        skip(name, "tooLarge");
        continue;
      }
      let faces: FontFace[];
      try {
        faces = readFonts(file.data);
      } catch (error) {
        if (!(error instanceof FontFormatError)) throw error;
        skip(name, "notFont");
        continue;
      }
      if (faces.some((face) => !face.embeddable)) {
        skip(name, "notEmbeddable");
        continue;
      }
      if (faces.every((face) => known.some((k) => same(k.family, face.family) && same(k.style, face.style)))) {
        skip(name, "duplicate");
        continue;
      }
      let path = PREFIX + name.replace(/[^\w.\- ]/g, "_");
      for (let n = 2; taken.has(path); n += 1) path = `${PREFIX}${basename(name, extname(name)).replace(/[^\w.\- ]/g, "_")}-${n}${extname(name)}`;
      taken.add(path);
      this.session.db.run("INSERT INTO files (path, data, updated_at) VALUES (?, ?, ?)", [path, file.data, this.now().getTime()]);
      known.push(...faces);
      for (const face of faces) if (!added.includes(face.family)) added.push(face.family);
    }
    return { view: await this.list(), added, skipped };
  }

  /** Takes a family of the project away, one that the settings still use stays unless force is true. */
  async remove(family: string, force: boolean): Promise<FontRemoveResult> {
    const usedIn = [...this.namesInSettings().entries()].filter(([name]) => same(name, family)).flatMap(([, where]) => where);
    if (usedIn.length > 0 && !force) return { view: await this.list(), removed: false, usedIn };
    let removed = false;
    for (const row of this.rows()) {
      const faces = this.facesOf(row.path, row.data);
      if (faces.length > 0 && faces.every((face) => same(face.family, family))) {
        this.session.db.run("DELETE FROM files WHERE path = ?", [row.path]);
        removed = true;
      }
    }
    return { view: await this.list(), removed, usedIn: [] };
  }
}
