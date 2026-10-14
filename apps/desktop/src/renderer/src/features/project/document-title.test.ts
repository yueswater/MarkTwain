import { describe, expect, it } from "@jest/globals";
import type { TFunction } from "i18next";
import { Locale } from "../../../../shared/enums/locale.enum";
import { translatorFor } from "../../../../main/core/translator";
import { documentTitle, projectNameFromPath } from "./document-title";

describe("documentTitle", () => {
  const zh = translatorFor(Locale.ZhHant, "project") as TFunction;
  const en = translatorFor(Locale.En, "project") as TFunction;

  it("自訂標題優先", () => {
    expect(documentTitle(zh, { kind: "chapter", position: 1, title: "緒論" })).toBe("緒論");
  });

  it("預設標題依種類與順序", () => {
    expect(documentTitle(zh, { kind: "chapter", position: 2, title: "" })).toBe("第 2 章");
    expect(documentTitle(en, { kind: "chapter", position: 2, title: "" })).toBe("Chapter 2");
    expect(documentTitle(zh, { kind: "abstract", position: 1, title: "" })).toBe("摘要");
    expect(documentTitle(en, { kind: "appendix", position: 3, title: "" })).toBe("Appendix 3");
  });
});

describe("projectNameFromPath", () => {
  it("去掉資料夾與副檔名，支援兩種分隔符與中文", () => {
    expect(projectNameFromPath("/a/b/我的論文.marktwain")).toBe("我的論文");
    expect(projectNameFromPath("C:\\Users\\x\\thesis.v2.marktwain")).toBe("thesis.v2");
    expect(projectNameFromPath("noext")).toBe("noext");
  });
});
