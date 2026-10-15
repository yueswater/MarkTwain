import { beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { ConfigService } from "../config/config.service";
import { ProjectRepository } from "../project/project.repository";
import { FontService } from "./font.service";

/** A font with a name table and an OS/2 table, enough for the reader. */
function font(family: string, options: { style?: string; fsType?: number } = {}): Uint8Array {
  const names = [
    { id: 1, text: family },
    { id: 2, text: options.style ?? "Regular" },
  ];
  const strings = names.map((n) => {
    const out = new Uint8Array(n.text.length * 2);
    for (let i = 0; i < n.text.length; i += 1) new DataView(out.buffer).setUint16(i * 2, n.text.charCodeAt(i));
    return out;
  });
  const nameLength = 6 + names.length * 12 + strings.reduce((sum, s) => sum + s.length, 0);
  const headerLength = 12 + 2 * 16;
  const bytes = new Uint8Array(headerLength + nameLength + 64);
  const v = new DataView(bytes.buffer);
  v.setUint32(0, 0x00010000);
  v.setUint16(4, 2);
  const put = (index: number, tag: string, offset: number, length: number) => {
    for (let i = 0; i < 4; i += 1) v.setUint8(12 + index * 16 + i, tag.charCodeAt(i));
    v.setUint32(12 + index * 16 + 8, offset);
    v.setUint32(12 + index * 16 + 12, length);
  };
  put(0, "OS/2", headerLength, 64);
  put(1, "name", headerLength + 64, nameLength);
  v.setUint16(headerLength + 4, 400);
  v.setUint16(headerLength + 8, options.fsType ?? 0);
  const base = headerLength + 64;
  v.setUint16(base + 2, names.length);
  v.setUint16(base + 4, 6 + names.length * 12);
  let offset = 0;
  names.forEach((n, i) => {
    const at = base + 6 + i * 12;
    v.setUint16(at, 3);
    v.setUint16(at + 4, 0x409);
    v.setUint16(at + 6, n.id);
    v.setUint16(at + 8, strings[i]!.length);
    v.setUint16(at + 10, offset);
    bytes.set(strings[i]!, base + 6 + names.length * 12 + offset);
    offset += strings[i]!.length;
  });
  return bytes;
}

let templateDir: string;
let session: DatabaseSession;
let config: ConfigService;
let service: FontService;

beforeEach(() => {
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  new ProjectRepository(db).insert("論文", 0);
  session = new DatabaseSession();
  session.open(db, ":memory:");
  templateDir = mkdtempSync(join(tmpdir(), "marktwain font "));
  mkdirSync(join(templateDir, "fonts"), { recursive: true });
  writeFileSync(join(templateDir, "fonts/Shipped-Regular.ttf"), font("Shipped"));
  config = new ConfigService(session, () => new Date(1), (path) => (path === "schools/default.yml" ? "layout:\n  font-latin: [Shipped]\n  font-cjk: [Gone Kai]\n" : null));
  service = new FontService(session, config, () => ({ typst: "typst", templateDir }), () => new Date(2), async () => ({ code: 0, stdout: "Installed Sans\nInstalled Serif\n" }));
});

describe("FontService", () => {
  it("lists the fonts of the template and of the computer, and a name of the settings that no font has", async () => {
    const view = await service.list();
    expect(view.families.map((f) => [f.source, f.name])).toEqual([
      ["template", "Shipped"],
      ["system", "Installed Sans"],
      ["system", "Installed Serif"],
    ]);
    expect(view.families[0]?.used).toBe(true);
    expect(view.missing).toEqual([{ name: "Gone Kai", usedIn: ["layout.font-cjk"] }]);
  });

  it("adds a font to the project, and the build gets its file", async () => {
    const result = await service.add([{ name: "My Face.ttf", data: font("My Face") }]);
    expect(result.added).toEqual(["My Face"]);
    expect(result.skipped).toEqual([]);
    expect(result.view.families.find((f) => f.source === "project")).toMatchObject({ name: "My Face", styles: ["Regular"], files: [{ path: "fonts/My Face.ttf" }] });
    expect(service.files().map((f) => f.path)).toEqual(["My Face.ttf"]);
    expect(result.view.projectBytes).toBeGreaterThan(0);
  });

  it("skips what is not a font, what may not be embedded, and what is there already", async () => {
    const result = await service.add([
      { name: "notes.ttf", data: new TextEncoder().encode("plain text, no font here") },
      { name: "picture.png", data: new Uint8Array(10) },
      { name: "Locked.ttf", data: font("Locked", { fsType: 2 }) },
      { name: "Again.ttf", data: font("Shipped") },
    ]);
    expect(result.added).toEqual([]);
    expect(result.skipped).toEqual([
      { name: "notes.ttf", reason: "notFont" },
      { name: "picture.png", reason: "notFont" },
      { name: "Locked.ttf", reason: "notEmbeddable" },
      { name: "Again.ttf", reason: "duplicate" },
    ]);
    expect(service.files()).toEqual([]);
  });

  it("adds the same file name twice under two paths and the same font only once", async () => {
    await service.add([{ name: "a.ttf", data: font("One") }]);
    const second = await service.add([{ name: "a.ttf", data: font("Two") }, { name: "b.ttf", data: font("One") }]);
    expect(second.added).toEqual(["Two"]);
    expect(second.skipped).toEqual([{ name: "b.ttf", reason: "duplicate" }]);
    expect(service.files().map((f) => f.path)).toEqual(["a-2.ttf", "a.ttf"]);
  });

  it("a font that the settings use stays unless it is forced out, and then the name is missing again", async () => {
    config.setAdvanced({ "layout.font-latin": ["My Face", "Shipped"] });
    expect((await service.list()).missing.map((m) => m.name)).toContain("My Face");
    await service.add([{ name: "My Face.ttf", data: font("My Face") }]);
    expect((await service.list()).missing.map((m) => m.name)).not.toContain("My Face");

    const blocked = await service.remove("My Face", false);
    expect(blocked).toMatchObject({ removed: false, usedIn: ["layout.font-latin"] });
    expect(service.files()).toHaveLength(1);

    const forced = await service.remove("My Face", true);
    expect(forced.removed).toBe(true);
    expect(service.files()).toEqual([]);
    expect(forced.view.missing.map((m) => m.name)).toContain("My Face");
  });

  it("a name after a font that is found is a fallback and is not reported", async () => {
    config.setAdvanced({ "layout.font-cjk": ["Shipped", "Gone Kai"], "layout.font-latin": ["Absent One", "Shipped", "Absent Two"] });
    expect((await service.list()).missing).toEqual([{ name: "Absent One", usedIn: ["layout.font-latin"] }]);
  });

  it("gives the bytes of a font of the project or the template and of nothing else", async () => {
    await service.add([{ name: "My Face.ttf", data: font("My Face") }]);
    expect(service.bytes("project", "fonts/My Face.ttf")?.byteLength).toBeGreaterThan(0);
    expect(service.bytes("project", "fonts/none.ttf")).toBeNull();
    const template = (await service.list()).families.find((f) => f.source === "template")?.files[0]?.path as string;
    expect(service.bytes("template", template)?.byteLength).toBeGreaterThan(0);
    expect(service.bytes("template", "/etc/passwd")).toBeNull();
  });

  it("reads the fonts of the real template when it is there", async () => {
    const real = resolve(__dirname, "../../../../../../resources/templates/typ");
    if (!existsSync(join(real, "fonts"))) return;
    const view = await new FontService(session, config, () => ({ typst: "typst", templateDir: real }), () => new Date(), async () => ({ code: 1, stdout: "" })).list();
    expect(view?.families.map((f) => f.name)).toEqual(expect.arrayContaining(["Tinos", "EB Garamond"]));
  });
});
