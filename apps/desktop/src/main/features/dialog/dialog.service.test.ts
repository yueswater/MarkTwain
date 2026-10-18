import { describe, expect, it } from "@jest/globals";
import type { TFunction } from "i18next";
import { translatorFor } from "../../core/translator";
import { Locale } from "../../../shared/enums/locale.enum";
import { DialogService, type DialogPort } from "./dialog.service";

function fakePort(save: string | null, open: string | null) {
  const calls: unknown[] = [];
  const port: DialogPort = {
    showSave: async (o) => (calls.push(o), save),
    showOpen: async (o) => (calls.push(o), open),
  };
  return { port, calls };
}

const t = (locale: Locale) => () => translatorFor(locale, "dialog") as TFunction;

describe("DialogService", () => {
  it("the path of a project is the one of the test hook, and null without it", () => {
    const { port } = fakePort(null, null);
    expect(new DialogService(port, t(Locale.En)).forcedProjectPath()).toBeNull();
    expect(new DialogService(port, t(Locale.En), () => "/forced.marktwain").forcedProjectPath()).toBe("/forced.marktwain");
  });

  it("選擇圖片：標題與篩選器翻譯，限制副檔名；測試鉤子可略過對話框", async () => {
    const { port, calls } = fakePort(null, "/x/a.png");
    const service = new DialogService(port, t(Locale.ZhHant));
    expect(await service.chooseImage()).toBe("/x/a.png");
    expect(calls[0]).toMatchObject({
      title: "選擇圖片",
      filters: [{ name: "圖片", extensions: ["png", "jpg", "jpeg", "svg"] }],
    });

    const forced = new DialogService(port, t(Locale.En), () => undefined, () => "/forced.png");
    expect(await forced.chooseImage()).toBe("/forced.png");
    expect(calls).toHaveLength(1);
  });

  it("export dialogs translate, and the test hook skips them", async () => {
    const { port, calls } = fakePort("/x/t.pdf", null);
    const service = new DialogService(port, t(Locale.ZhHant));
    expect(await service.choosePdfPath("論文")).toBe("/x/t.pdf");
    expect(calls[0]).toMatchObject({ title: "匯出 PDF", defaultPath: "論文.pdf", filters: [{ name: "PDF 文件", extensions: ["pdf"] }] });
    expect(await service.chooseZipPath("論文-typst")).toBe("/x/t.pdf");
    expect(calls[1]).toMatchObject({ title: "匯出專案", defaultPath: "論文-typst.zip", filters: [{ name: "ZIP 壓縮檔", extensions: ["zip"] }] });

    const forced = new DialogService(port, t(Locale.En), () => undefined, () => undefined, () => "/forced");
    expect(await forced.choosePdfPath("a")).toBe("/forced");
    expect(await forced.chooseZipPath("a")).toBe("/forced");
    expect(calls).toHaveLength(2);
  });
});
