import { describe, expect, it } from "@jest/globals";
import { isLocale, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("使用者的設定優先於作業系統語系", () => {
    expect(resolveLocale("en-US", "zh-Hant")).toBe("zh-Hant");
    expect(resolveLocale("zh-TW", "en")).toBe("en");
  });

  it("沒有設定時，zh 開頭的系統語系用繁體中文", () => {
    expect(resolveLocale("zh-TW", null)).toBe("zh-Hant");
    expect(resolveLocale("zh-CN", null)).toBe("zh-Hant");
  });

  it("沒有設定時，en 開頭的系統語系用英文", () => {
    expect(resolveLocale("en-US", null)).toBe("en");
  });

  it("沒有設定且系統語系不支援時用英文", () => {
    expect(resolveLocale("ja-JP", null)).toBe("en");
    expect(resolveLocale("", null)).toBe("en");
  });
});

describe("isLocale", () => {
  it("只接受支援的語言", () => {
    expect(isLocale("zh-Hant")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("拒絕其他值", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});
