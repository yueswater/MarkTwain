import { describe, expect, it } from "@jest/globals";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PROFILE } from "../../../shared/profile";
import { PrefsService } from "../prefs/prefs.service";
import { SettingsRepository } from "../settings/settings.repository";
import { ProfileService } from "./profile.service";

const repo = () => new SettingsRepository(join(mkdtempSync(join(tmpdir(), "marktwain 作者資料 ")), "settings.json"));

describe("ProfileService", () => {
  it("starts empty and asks, and keeps what is set from one run to the next", () => {
    const repository = repo();
    const service = new ProfileService(repository);
    expect(service.get()).toEqual(DEFAULT_PROFILE);
    service.set({ author: "宋品岳", school: "nccu" });
    expect(new ProfileService(repository).get()).toMatchObject({ author: "宋品岳", school: "nccu", ask: true });
  });

  it("applies patches one on top of another, and turns the question off", () => {
    const service = new ProfileService(repo());
    service.set({ author: "甲" });
    expect(service.set({ ask: false })).toMatchObject({ author: "甲", ask: false });
  });

  it("does not disturb the editor preferences that share the file", () => {
    const repository = repo();
    new PrefsService(repository).set({ fontSize: 20 });
    new ProfileService(repository).set({ author: "甲" });
    expect(new PrefsService(repository).get().fontSize).toBe(20);
  });
});
