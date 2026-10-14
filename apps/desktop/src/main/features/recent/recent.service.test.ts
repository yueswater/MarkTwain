import { beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SettingsRepository } from "../settings/settings.repository";
import { SettingsService } from "../settings/settings.service";
import { RecentService } from "./recent.service";

let repo: SettingsRepository;
let existing: Set<string>;
let clock: number;
let service: RecentService;

beforeEach(() => {
  repo = new SettingsRepository(join(mkdtempSync(join(tmpdir(), "marktwain 最近 ")), "settings.json"));
  existing = new Set(["/a.marktwain", "/b.marktwain"]);
  clock = 1000;
  service = new RecentService(repo, () => new Date(clock++), (path) => existing.has(path));
});

describe("RecentService", () => {
  it("records the newest project first and remembers it as the last one", () => {
    service.record("/a.marktwain", "A");
    service.record("/b.marktwain", "B");
    expect(service.list().map((p) => p.name)).toEqual(["B", "A"]);
    expect(service.lastPath()).toBe("/b.marktwain");
  });

  it("moves a project that is opened again to the front without duplicating it", () => {
    service.record("/a.marktwain", "A");
    service.record("/b.marktwain", "B");
    service.record("/a.marktwain", "A again");
    expect(service.list().map((p) => p.name)).toEqual(["A again", "B"]);
  });

  it("marks files that no longer exist, and does not reopen them", () => {
    service.record("/a.marktwain", "A");
    existing.delete("/a.marktwain");
    expect(service.list()[0]?.exists).toBe(false);
    expect(service.lastPath()).toBeNull();
  });

  it("closing on purpose clears the last project but keeps the list", () => {
    service.record("/a.marktwain", "A");
    service.clearLast();
    expect(service.lastPath()).toBeNull();
    expect(service.list()).toHaveLength(1);
  });

  it("removes an entry, and keeps at most twelve", () => {
    for (let i = 0; i < 15; i += 1) service.record(`/p${i}.marktwain`, `P${i}`);
    expect(service.list()).toHaveLength(12);
    expect(service.remove("/p14.marktwain").some((p) => p.path === "/p14.marktwain")).toBe(false);
  });

  it("changing the language does not wipe the list", () => {
    service.record("/a.marktwain", "A");
    new SettingsService(repo).setLocale("en", "en-US");
    expect(service.list()).toHaveLength(1);
    expect(repo.read().locale).toBe("en");
  });

  it("ignores a damaged settings file", () => {
    expect(new SettingsRepository("/nonexistent/settings.json").read()).toEqual({ locale: null, recentProjects: [], lastProject: null });
  });
});
