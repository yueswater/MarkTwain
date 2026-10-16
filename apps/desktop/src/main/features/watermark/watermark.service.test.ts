import { beforeEach, describe, expect, it } from "@jest/globals";
import { defaultFields } from "@marktwain/schema";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { AssetRepository } from "../asset/asset.repository";
import { ConfigService } from "../config/config.service";
import { ProjectRepository } from "../project/project.repository";
import { WatermarkService } from "./watermark.service";

const templateDir = resolve(__dirname, "../../../../../../resources/templates/typ");

let session: DatabaseSession;
let config: ConfigService;
let watermarks: WatermarkService;
let dir: string;
const thumbs: string[] = [];

beforeEach(() => {
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  new ProjectRepository(db).insert("我的論文", "typst", 0);
  session = new DatabaseSession();
  session.open(db, ":memory:");
  config = new ConfigService(session, () => new Date(5), (path) => {
    try {
      return readFileSync(join(templateDir, path), "utf8");
    } catch {
      return null;
    }
  });
  thumbs.length = 0;
  watermarks = new WatermarkService(
    session,
    config,
    () => ({ typst: "typst", templateDir }),
    () => new Date(7),
    async ({ name }) => {
      thumbs.push(name);
      return new Uint8Array([1, 2, 3]);
    },
  );
  dir = mkdtempSync(join(tmpdir(), "marktwain wm "));
});

const choose = (path: string | null) => ({ chooseWatermark: async () => path });

describe("WatermarkService", () => {
  it("follows the school, which brings its own watermark", async () => {
    expect(await watermarks.info()).toMatchObject({ mode: "school", school: null, custom: null });
    config.set({ ...defaultFields(), title: "題目", author: "王", school: "nccu" });
    const info = await watermarks.info();
    expect(info.mode).toBe("school");
    expect(info.school).toEqual({ name: "nccu.pdf", thumbnail: "data:image/png;base64,AQID" });
    expect(thumbs).toEqual(["nccu.pdf"]);
    // The picture is drawn once
    await watermarks.info();
    expect(thumbs).toEqual(["nccu.pdf"]);
  });

  it("stores a chosen file in the project and names it in the settings", async () => {
    const file = join(dir, "校徽 logo.png");
    writeFileSync(file, Buffer.from([137, 80, 78, 71]));
    const info = await watermarks.choose(choose(file));
    expect(info?.mode).toBe("custom");
    // Letters outside the basic set become underscores, so the name is safe in a path
    expect(info?.custom?.name).toBe("___logo.png");
    expect(config.advanced().values["watermark.image"]).toBe("/assets/watermarks/___logo.png");
    expect(watermarks.files().map((f) => f.path)).toEqual(["___logo.png"]);
    // The build writes it, the images of the project do not include it
    expect(new AssetRepository(session.db).list()).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("replaces the earlier file when another one is chosen", async () => {
    const a = join(dir, "a.png");
    const b = join(dir, "b.pdf");
    writeFileSync(a, "a");
    writeFileSync(b, "b");
    await watermarks.choose(choose(a));
    await watermarks.choose(choose(b));
    expect(watermarks.files().map((f) => f.path)).toEqual(["b.pdf"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns null when the choice is cancelled and refuses a file of another type", async () => {
    expect(await watermarks.choose(choose(null))).toBeNull();
    const text = join(dir, "x.txt");
    writeFileSync(text, "x");
    await expect(watermarks.choose(choose(text))).rejects.toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it("knows when the watermark is turned off and reads the width and opacity", async () => {
    config.setAdvanced({ "watermark.image": "none", "watermark.width": 60, "watermark.opacity": 30 });
    expect(await watermarks.info()).toMatchObject({ mode: "none", width: 60, opacity: 30 });
    // An image of the project stays available while it is not used
    const file = join(dir, "keep.png");
    writeFileSync(file, "x");
    await watermarks.choose(choose(file));
    config.setAdvanced({ "watermark.image": "none" });
    expect(await watermarks.info()).toMatchObject({ mode: "none", custom: { name: "keep.png" } });
    rmSync(dir, { recursive: true, force: true });
  });
});
