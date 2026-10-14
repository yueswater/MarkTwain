import { describe, expect, it } from "@jest/globals";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PREFS } from "../../../shared/prefs";
import { RecentService } from "../recent/recent.service";
import { SettingsRepository } from "../settings/settings.repository";
import { SettingsService } from "../settings/settings.service";
import { PrefsService } from "./prefs.service";

const repo = () => new SettingsRepository(join(mkdtempSync(join(tmpdir(), "marktwain 偏好 ")), "settings.json"));

describe("PrefsService", () => {
  it("starts with the defaults and keeps what is set", () => {
    const service = new PrefsService(repo());
    expect(service.get()).toEqual(DEFAULT_PREFS);
    expect(service.set({ fontSize: 20, lineNumbers: true })).toMatchObject({ fontSize: 20, lineNumbers: true });
    expect(service.get().fontSize).toBe(20);
  });

  it("clamps bad values and applies patches one on top of another", () => {
    const service = new PrefsService(repo());
    service.set({ fontSize: 20 });
    expect(service.set({ lineHeight: 99 })).toMatchObject({ fontSize: 20, lineHeight: 2.4 });
  });

  it("does not disturb the language or the recent projects, and they do not disturb it", () => {
    const store = repo();
    const prefs = new PrefsService(store);
    prefs.set({ spellcheck: true });
    new RecentService(store).record("/a.marktwain", "A");
    new SettingsService(store).setLocale("en", "en-US");
    expect(prefs.get().spellcheck).toBe(true);
    expect(store.read().recentProjects).toHaveLength(1);
    expect(store.read().locale).toBe("en");
  });
});
