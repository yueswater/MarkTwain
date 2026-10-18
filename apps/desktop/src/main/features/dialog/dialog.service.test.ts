import { describe, expect, it } from "@jest/globals";
import type { TFunction } from "i18next";
import { translatorFor } from "../../core/translator";
import { Locale } from "../../../shared/enums/locale.enum";
import { DialogService, type DialogPort } from "./dialog.service";

function fakePort(open: string | null) {
  const calls: unknown[] = [];
  const port: DialogPort = {
    showOpen: async (o) => (calls.push(o), open),
  };
  return { port, calls };
}

const t = (locale: Locale) => () => translatorFor(locale, "dialog") as TFunction;

describe("DialogService", () => {
  it("the path of a project is the one of the test hook, and null without it", () => {
    const { port } = fakePort(null);
    expect(new DialogService(port, t(Locale.En)).forcedProjectPath()).toBeNull();
    expect(new DialogService(port, t(Locale.En), () => "/forced.marktwain").forcedProjectPath()).toBe("/forced.marktwain");
  });

  it("選擇圖片：標題與篩選器翻譯，限制副檔名；測試鉤子可略過對話框", async () => {
    const { port, calls } = fakePort("/x/a.png");
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

  it("the path of an export is the one of the test hook, and null without it", () => {
    const { port } = fakePort(null);
    expect(new DialogService(port, t(Locale.En)).forcedExport()).toBeNull();
    expect(new DialogService(port, t(Locale.En), () => undefined, () => undefined, () => "/forced.zip").forcedExport()).toBe("/forced.zip");
  });
});
