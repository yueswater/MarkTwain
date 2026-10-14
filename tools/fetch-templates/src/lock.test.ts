import { describe, expect, it } from "@jest/globals";
import { parseLock } from "./lock";

const SHA_A = "61ca45c47da54e11600a6af2b1f4c03775f1a569";
const SHA_B = "24361d4889be478f73ac86976417e0a2acb29dfc";

function lockText(override: Record<string, unknown> = {}): string {
  return JSON.stringify({
    templates: {
      typ: { repo: "TW-Thesis/tw-thesis-typ", tag: "v1.0.0", commit: SHA_A },
      tex: { repo: "TW-Thesis/tw-thesis-tex", tag: "v1.0.0", commit: SHA_B },
      ...override,
    },
  });
}

describe("parseLock", () => {
  it("解析有效的鎖定檔", () => {
    const lock = parseLock(lockText());
    expect(lock.templates.typ).toEqual({
      repo: "TW-Thesis/tw-thesis-typ",
      tag: "v1.0.0",
      commit: SHA_A,
    });
    expect(lock.templates.tex.commit).toBe(SHA_B);
  });

  it("不是 JSON 時拋錯", () => {
    expect(() => parseLock("not json")).toThrow("不是有效的 JSON");
  });

  it("缺少 templates 時拋錯", () => {
    expect(() => parseLock("{}")).toThrow('缺少 "templates"');
  });

  it("缺少某個模板時拋錯", () => {
    const text = JSON.stringify({
      templates: {
        typ: { repo: "TW-Thesis/tw-thesis-typ", tag: "v1.0.0", commit: SHA_A },
      },
    });
    expect(() => parseLock(text)).toThrow('缺少 "tex"');
  });

  it("repo 格式錯誤時拋錯", () => {
    const text = lockText({
      tex: { repo: "no-slash", tag: "v1.0.0", commit: SHA_B },
    });
    expect(() => parseLock(text)).toThrow('"tex".repo');
  });

  it("commit 不是 40 位十六進位時拋錯", () => {
    const text = lockText({
      typ: { repo: "TW-Thesis/tw-thesis-typ", tag: "v1.0.0", commit: "abc123" },
    });
    expect(() => parseLock(text)).toThrow('"typ".commit');
  });
});
