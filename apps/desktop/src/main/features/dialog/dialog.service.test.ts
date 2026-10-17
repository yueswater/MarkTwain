import { describe, expect, it } from "@jest/globals";
import type { TFunction } from "i18next";
import { translatorFor } from "../../core/translator";
import { Locale } from "../../../shared/enums/locale.enum";
import { DialogService, withExtension, type DialogPort } from "./dialog.service";

function fakePort(save: string | null, open: string | null) {
  const calls: unknown[] = [];
  const port: DialogPort = {
    showSave: async (o) => (calls.push(o), save),
    showOpen: async (o) => (calls.push(o), open),
    showFolder: async (o) => (calls.push(o), open),
  };
  return { port, calls };
}

const t = (locale: Locale) => () => translatorFor(locale, "dialog") as TFunction;

describe("DialogService", () => {
  it("標題與篩選器依語言翻譯", async () => {
    const zh = fakePort("/x/a.marktwain", null);
    await new DialogService(zh.port, t(Locale.ZhHant)).chooseNewProject("論文");
    expect(zh.calls[0]).toMatchObject({
      title: "建立專案",
      defaultPath: "論文.marktwain",
      filters: [{ name: "MarkTwain 專案", extensions: ["marktwain"] }],
    });

    const en = fakePort(null, "/x/a.marktwain");
    await new DialogService(en.port, t(Locale.En)).chooseOpenProject();
    expect(en.calls[0]).toMatchObject({ title: "Open a project", buttonLabel: "Open" });
  });

  it("取消時回傳 null", async () => {
    const { port } = fakePort(null, null);
    const service = new DialogService(port, t(Locale.En));
    expect(await service.chooseNewProject("a")).toBeNull();
    expect(await service.chooseOpenProject()).toBeNull();
  });

  it("儲存路徑缺副檔名時補上", async () => {
    const { port } = fakePort("/x/論文", null);
    expect(await new DialogService(port, t(Locale.En)).chooseNewProject("a")).toBe(
      "/x/論文.marktwain",
    );
    expect(withExtension("/x/a.marktwain")).toBe("/x/a.marktwain");
  });

  it("測試鉤子有值時不開對話框", async () => {
    const { port, calls } = fakePort("/no", "/no");
    const service = new DialogService(port, t(Locale.En), () => "/forced.marktwain");
    expect(await service.chooseNewProject("a")).toBe("/forced.marktwain");
    expect(await service.chooseOpenProject()).toBe("/forced.marktwain");
    expect(calls).toHaveLength(0);
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
    const { port, calls } = fakePort("/x/t.pdf", "/x/out");
    const service = new DialogService(port, t(Locale.ZhHant));
    expect(await service.choosePdfPath("論文")).toBe("/x/t.pdf");
    expect(calls[0]).toMatchObject({ title: "匯出 PDF", defaultPath: "論文.pdf", filters: [{ name: "PDF 文件", extensions: ["pdf"] }] });
    expect(await service.chooseExportFolder()).toBe("/x/out");
    expect(calls[1]).toMatchObject({ title: "選擇專案的匯出位置" });

    const forced = new DialogService(port, t(Locale.En), () => undefined, () => undefined, () => "/forced");
    expect(await forced.choosePdfPath("a")).toBe("/forced");
    expect(await forced.chooseExportFolder()).toBe("/forced");
    expect(calls).toHaveLength(2);
  });
});
