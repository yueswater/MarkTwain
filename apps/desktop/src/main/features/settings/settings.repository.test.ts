import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SettingsRepository } from "./settings.repository";

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
    expect(new SettingsRepository(join(dir, "settings.json")).read()).toEqual({ locale: null });
  });

  it("檔案損毀時回傳預設值", () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, "{ not json");
    expect(new SettingsRepository(file).read()).toEqual({ locale: null });
  });

  it("不認得的語言值視為未設定", () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify({ locale: "fr" }));
    expect(new SettingsRepository(file).read()).toEqual({ locale: null });
  });
});

describe("SettingsRepository.write", () => {
  it("寫入後可以讀回", () => {
    const repo = new SettingsRepository(join(dir, "settings.json"));
    repo.write({ locale: "en" });
    expect(repo.read()).toEqual({ locale: "en" });
  });

  it("目標資料夾不存在時會建立", () => {
    const repo = new SettingsRepository(join(dir, "nested", "deeper", "settings.json"));
    repo.write({ locale: "zh-Hant" });
    expect(repo.read()).toEqual({ locale: "zh-Hant" });
  });
});
