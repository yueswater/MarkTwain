import { describe, expect, it } from "@jest/globals";
import { describeLocale } from "./locale.helper";

describe("describeLocale", () => {
  it("保留使用者的設定並算出實際語言", () => {
    expect(describeLocale("en-US", "zh-Hant")).toEqual({ setting: "zh-Hant", effective: "zh-Hant" });
  });

  it("沒有設定時依作業系統語系", () => {
    expect(describeLocale("zh-TW", null)).toEqual({ setting: null, effective: "zh-Hant" });
    expect(describeLocale("de-DE", null)).toEqual({ setting: null, effective: "en" });
  });
});
