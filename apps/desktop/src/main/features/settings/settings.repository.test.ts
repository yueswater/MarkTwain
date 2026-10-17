import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SettingsRepository } from "./settings.repository";
import { DEFAULT_SETTINGS } from "./settings.types";

let dir: string;

beforeEach(() => {
  // Path deliberately contains a space and Chinese characters
  dir = mkdtempSync(join(tmpdir(), "marktwain 設定 "));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("SettingsRepository.read", () => {
  it("檔案不存在時回傳預設值（跟隨系統語言）", () => {
    expect(new SettingsRepository(join(dir, "settings.json")).read()).toEqual({ ...DEFAULT_SETTINGS });
  });

  it("檔案損毀時回傳預設值", () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, "{ not json");
    expect(new SettingsRepository(file).read()).toEqual({ ...DEFAULT_SETTINGS });
  });

  it("不認得的語言值視為未設定", () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify({ locale: "fr" }));
    expect(new SettingsRepository(file).read()).toEqual({ ...DEFAULT_SETTINGS });
  });
});

describe("SettingsRepository.write", () => {
  it("寫入後可以讀回", () => {
    const repo = new SettingsRepository(join(dir, "settings.json"));
    repo.write({ ...DEFAULT_SETTINGS, locale: "en" });
    expect(repo.read()).toEqual({ ...DEFAULT_SETTINGS, locale: "en" });
  });

  it("目標資料夾不存在時會建立", () => {
    const repo = new SettingsRepository(join(dir, "nested", "deeper", "settings.json"));
    repo.write({ ...DEFAULT_SETTINGS, locale: "zh-Hant" });
    expect(repo.read()).toEqual({ ...DEFAULT_SETTINGS, locale: "zh-Hant" });
  });
});

describe("SettingsRepository.read, the marks of the changes", () => {
  it("turns them off in a file from before the version, where they were on from the start", () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify({ editor: { showChanges: true } }));
    expect(new SettingsRepository(file).read().editor.showChanges).toBe(false);
  });

  it("keeps a choice that was made after that", () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify({ version: 2, editor: { showChanges: true } }));
    expect(new SettingsRepository(file).read().editor.showChanges).toBe(true);
  });
});
