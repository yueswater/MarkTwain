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
});
