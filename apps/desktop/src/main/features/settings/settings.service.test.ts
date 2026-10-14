import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "../../core/errors";
import { SettingsRepository } from "./settings.repository";
import { SettingsService } from "./settings.service";

let dir: string;
let service: SettingsService;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "marktwain 設定 "));
  service = new SettingsService(new SettingsRepository(join(dir, "settings.json")));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("SettingsService.getLocale", () => {
  it("沒有設定時依作業系統語系", () => {
    expect(service.getLocale("zh-TW")).toEqual({ setting: null, effective: "zh-Hant" });
    expect(service.getLocale("en-US")).toEqual({ setting: null, effective: "en" });
  });
});

describe("SettingsService.setLocale", () => {
  it("儲存設定，之後的讀取沿用，且優先於作業系統語系", () => {
    expect(service.setLocale("en", "zh-TW")).toEqual({ setting: "en", effective: "en" });
    expect(service.getLocale("zh-TW")).toEqual({ setting: "en", effective: "en" });
  });

  it("設為 null 會改回跟隨作業系統", () => {
    service.setLocale("en", "zh-TW");
    expect(service.setLocale(null, "zh-TW")).toEqual({ setting: null, effective: "zh-Hant" });
  });

  it("不支援的語言丟出帶代碼的 AppError，且不寫入", () => {
    const bad = "fr" as unknown as "en";
    let caught: unknown;
    try {
      service.setLocale(bad, "en-US");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe("settings.invalid-locale");
    expect((caught as AppError).params).toEqual({ value: "fr" });
    expect(service.getLocale("en-US").setting).toBeNull();
  });
});
